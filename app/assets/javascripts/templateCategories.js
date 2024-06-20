/**
 * This function initializes the template categories functionality.
 * It hides the button container and shows the radio buttons when the button is clicked.
 * It also focuses on the first selected radio button, or the first radio button under #tc_expand if none are selected.
 */
(function () {
  const button_container = document.getElementById("tc_button_container");
  const radios = document.getElementById("tc_radios");

  // if div #tc_button exists, hide input
  if (button_container) {
    button_container
      .querySelector("button")
      .addEventListener("click", function () {
        button_container.classList.add("hidden");
        radios.classList.remove("hidden");

        // focus on the first selected radio, or if none are selected, the first radio under #tc_expand
        const selectedRadio = radios.querySelector("input:checked");
        if (selectedRadio) {
          selectedRadio.focus();
        } else {
          document.querySelector("#tc_expand input").focus();
        }
      });
  }
})();
