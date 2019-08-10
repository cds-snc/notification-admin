(function(Modules) {
  "use strict";

  $("body").on("click", "button[data-button-id='register-key']", function(e) {
    e.preventDefault()
    console.log($(this).text());

    fetch('/user-profile/security_keys/add', {
      method: 'POST',
      headers:{
        'X-CSRFToken': csrf_token
      }
    }).then(function(response) {
      if(response.ok) return response.arrayBuffer();
      throw new Error('Error getting registration data!');
    })
    .then(CBOR.decode).then(function(options) {
      return navigator.credentials.create(options);
    }).then(function(attestation) {
      return fetch('/user-profile/security_keys/complete', {
        method: 'POST',
        headers: {'Content-Type': 'application/cbor', 'X-CSRFToken': csrf_token},
        body: CBOR.encode({
            "name": $("#keyname").val(),
            "attestationObject": new Uint8Array(attestation.response.attestationObject),
            "clientDataJSON": new Uint8Array(attestation.response.clientDataJSON),
        })
      });
    })

    //
  });
  

  Modules.Fido2 = function() {};
})(window.GOVUK.Modules);