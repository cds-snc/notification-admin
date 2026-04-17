(function (Modules) {
  "use strict";

  // --- base64url helpers ---
  function base64urlToBuffer(base64url) {
    var base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function bufferToBase64url(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // Convert server JSON to PublicKeyCredentialRequestOptions for navigator.credentials.get()
  function prepareGetOptions(serverData) {
    var publicKey = serverData.publicKey;
    var opts = Object.assign({}, publicKey);
    if (opts.challenge) opts.challenge = base64urlToBuffer(opts.challenge);
    if (opts.allowCredentials) {
      opts.allowCredentials = opts.allowCredentials.map(function (cred) {
        return Object.assign({}, cred, { id: base64urlToBuffer(cred.id) });
      });
    }
    return { publicKey: opts };
  }

  // Convert server JSON to PublicKeyCredentialCreationOptions for navigator.credentials.create()
  function prepareCreateOptions(serverData) {
    var publicKey = serverData.publicKey;
    var opts = Object.assign({}, publicKey);
    if (opts.challenge) opts.challenge = base64urlToBuffer(opts.challenge);
    if (opts.user) {
      opts.user = Object.assign({}, opts.user, {
        id: base64urlToBuffer(opts.user.id),
      });
    }
    if (opts.excludeCredentials) {
      opts.excludeCredentials = opts.excludeCredentials.map(function (cred) {
        return Object.assign({}, cred, { id: base64urlToBuffer(cred.id) });
      });
    }
    return { publicKey: opts };
  }

  // Build a standard WebAuthn AuthenticationResponse JSON from an assertion
  function buildAuthenticationResponse(assertion) {
    return {
      id: bufferToBase64url(assertion.rawId),
      rawId: bufferToBase64url(assertion.rawId),
      response: {
        authenticatorData: bufferToBase64url(
          assertion.response.authenticatorData,
        ),
        clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
        signature: bufferToBase64url(assertion.response.signature),
      },
      type: assertion.type,
    };
  }

  // Build a standard WebAuthn RegistrationResponse JSON from an attestation
  function buildRegistrationResponse(attestation) {
    return {
      id: bufferToBase64url(attestation.rawId),
      rawId: bufferToBase64url(attestation.rawId),
      response: {
        attestationObject: bufferToBase64url(
          attestation.response.attestationObject,
        ),
        clientDataJSON: bufferToBase64url(attestation.response.clientDataJSON),
      },
      type: attestation.type,
    };
  }

  // --- 2FA login flow ---
  $(document).on("ready", function () {
    if ($("#two-factor-fido").length) {
      fetch("/user-profile/security_keys/authenticate-fido2", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrf_token,
        },
      })
        .then(function (response) {
          if (response.ok) return response.json();
          throw new Error("Error getting authentication data!");
        })
        .then(function (data) {
          return navigator.credentials.get(prepareGetOptions(data));
        })
        .then(function (assertion) {
          return fetch("/user-profile/security_keys/validate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrf_token,
            },
            body: JSON.stringify({
              credential: buildAuthenticationResponse(assertion),
            }),
          });
        })
        .then(function (response) {
          if (response.ok) {
            window.location = "/two-factor-sms-sent" + window.location.search;
          } else {
            alert("Bad key");
          }
        });
    }
  });

  // --- Register new key flow ---
  $("body").on("click", "button[data-button-id='register-key']", function (e) {
    let name = $.trim($("#keyname").val());

    if (name == "") {
      return true;
    }

    e.preventDefault();

    fetch("/user-profile/security_keys/add", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf_token,
      },
    })
      .then(function (response) {
        if (response.ok) return response.json();
        throw new Error("Error getting registration data!");
      })
      .then(function (data) {
        return navigator.credentials.create(prepareCreateOptions(data));
      })
      .catch(function (error) {
        window.location = "/user-profile/security_keys/add?duplicate";
        return Promise.reject(error);
      })
      .then(function (attestation) {
        return fetch("/user-profile/security_keys/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf_token,
          },
          body: JSON.stringify({
            name: name,
            credential: buildRegistrationResponse(attestation),
          }),
        });
      })
      .then(function (response) {
        return response.json();
      })
      .then(function (body) {
        console.log(body);
        window.location =
          body.from_send_page === "user_profile_2fa"
            ? "/user-profile/2fa"
            : "/user-profile/security_keys";
      });
  });

  // --- Test keys flow ---
  $("body").on("click", "#test-fido2-keys", function (e) {
    e.preventDefault();

    fetch("/user-profile/security_keys/authenticate-fido2", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf_token,
      },
    })
      .then(function (response) {
        if (response.ok) return response.json();
        throw new Error("Error getting authentication data!");
      })
      .then(function (data) {
        return navigator.credentials.get(prepareGetOptions(data));
      })
      .then(function (assertion) {
        return fetch("/user-profile/security_keys/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf_token,
          },
          body: JSON.stringify({
            credential: buildAuthenticationResponse(assertion),
          }),
        });
      })
      .then(function (response) {
        if (response.ok) {
          var html = '<div class="mb-12 clear-both">';
          html += '<div class="banner banner-with-tick">Key(s) worked</div>';
          html += "</div>";
          $(".test-key-message").html(html);
        } else {
          var html = '<div class="mb-12 clear-both">';
          html +=
            '<div class="banner banner-dangerous" role="group" tabindex="-1">Key(s) failed</div>';
          html += "</div>";

          $(".test-key-message").html(html);
        }
      });
  });

  Modules.Fido2 = function () {};
})(window.GOVUK.Modules);
