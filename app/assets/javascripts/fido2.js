(function(Modules) {
  "use strict";

  $(document).on("ready", function() {
    if ($("#two-factor-fido").length) {
      fetch("/user-profile/security_keys/authenticate", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrf_token
        }
      })
        .then(function(response) {
          if (response.ok) return response.arrayBuffer();
          throw new Error("Error getting registration data!");
        })
        .then(CBOR.decode)
        .then(function(options) {
          return navigator.credentials.get(options);
        })
        .then(function(assertion) {
          return fetch("/user-profile/security_keys/validate", {
            method: "POST",
            headers: {
              "Content-Type": "application/cbor",
              "X-CSRFToken": csrf_token
            },
            body: CBOR.encode({
              credentialId: new Uint8Array(assertion.rawId),
              authenticatorData: new Uint8Array(
                assertion.response.authenticatorData
              ),
              clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
              signature: new Uint8Array(assertion.response.signature)
            })
          });
        })
        .then(function(response) {
          if (response.ok) {
            window.location = "/two-factor-sms-sent" + window.location.search;
          } else {
            alert("Bad key");
          }
        });
    }
  });

  $("body").on("click", "button[data-button-id='register-key']", function(e) {
    let name = $.trim($("#keyname").val());

    if (name == "") {
      return true;
    }

    e.preventDefault();

    fetch("/user-profile/security_keys/add", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf_token
      }
    })
      .then(function(response) {
        if (response.ok) return response.arrayBuffer();
        throw new Error("Error getting registration data!");
      })
      .then(CBOR.decode)
      .then(function(options) {
        return navigator.credentials.create(options);
      })
      .then(function(attestation) {
        return fetch("/user-profile/security_keys/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/cbor",
            "X-CSRFToken": csrf_token
          },
          body: CBOR.encode({
            name: name,
            attestationObject: new Uint8Array(
              attestation.response.attestationObject
            ),
            clientDataJSON: new Uint8Array(attestation.response.clientDataJSON)
          })
        });
      })
      .then(function(response) {
        window.location = "/user-profile/security_keys";
      });
  });

  $("body").on("click", "#test-fido2-keys", function(e) {
    e.preventDefault();

    fetch("/user-profile/security_keys/authenticate", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf_token
      }
    })
      .then(function(response) {
        if (response.ok) return response.arrayBuffer();
        throw new Error("Error getting registration data!");
      })
      .then(CBOR.decode)
      .then(function(options) {
        return navigator.credentials.get(options);
      })
      .then(function(assertion) {
        return fetch("/user-profile/security_keys/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/cbor",
            "X-CSRFToken": csrf_token
          },
          body: CBOR.encode({
            credentialId: new Uint8Array(assertion.rawId),
            authenticatorData: new Uint8Array(
              assertion.response.authenticatorData
            ),
            clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
            signature: new Uint8Array(assertion.response.signature)
          })
        });
      })
      .then(function(response) {
        if (response.ok) {
          var html = '<div class="mb-12 clear-both">'
              html+='<div class="banner banner-with-tick">Key(s) worked</div>';
              html+='</div>';
          $('.test-key-message').html(html)
        } else {
          var html = '<div class="mb-12 clear-both">'
              html+='<div class="banner banner-dangerous" role="group" tabindex="-1">Key(s) failed</div>';
              html+='</div>';

          $('.test-key-message').html(html)

        }
      });
  });

  Modules.Fido2 = function() {};
})(window.GOVUK.Modules);
