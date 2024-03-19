(function () {
  "use strict";
  const input_img = document.querySelector("input.file-upload-field");
  const input_brandname = document.querySelector("#name");
  const submit_button = document.querySelector("button[type=submit]");
  const message = document.querySelector(".preview .message");
  const image_slot = document.querySelector(".preview .img");
  const preview_heading = document.querySelector("#preview_heading");
  const brand_name_group = document.querySelector("#name").closest('.form-group');
  const image_label = document.getElementById("file-upload-label");

  // init UI
  input_img.style.opacity = 0;
  input_img.addEventListener("change", updateImageDisplay);
  submit_button.addEventListener("click", validateForm);
  input_brandname.addEventListener("change", validateBrand);
  // strings
  let file_error = window.APP_PHRASES.branding_request_error;
  let file_name = window.APP_PHRASES.branding_request_file_name;
  let file_size = window.APP_PHRASES.branding_request_file_size;
  let display_size = window.APP_PHRASES.branding_request_display_size;
  let brand_error = window.APP_PHRASES.branding_request_brand_error;
  let logo_error = window.APP_PHRASES.branding_request_logo_error;

  // error message html
  let brand_error_html = `<span id="name-error-message" data-testid="brand-error" class="error-message" data-module="track-error" data-error-type="${brand_error}" data-error-label="name">${brand_error}</span>`;
  let image_error_html = `<span id="logo-error-message" data-testid="logo-error" class="error-message">${logo_error}</span>`;

  /**
   * Update email template preview based on the selected file
   */
  function updateImageDisplay() {
    // remove the last image
    while (image_slot.firstChild) {
      image_slot.removeChild(image_slot.firstChild);
    }

    const curFiles = input_img.files;
    if (curFiles.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No files currently selected for upload";
    } else {
      for (const file of curFiles) {
        if (validFileType(file)) {
          const img_src = URL.createObjectURL(file);
          const img = document
            .getElementById("template_preview")
            .shadowRoot.querySelector("img");
          img.src = encodeURI(img_src);

          img.onload = () => {
            message.textContent = `${file_name} ${
              file.name
            }, ${file_size} ${returnFileSize(file.size)}, ${display_size} ${
              img.naturalWidth
            } x ${img.naturalHeight}`;
            document
              .querySelector(".template_preview")
              .classList.remove("hidden");
            preview_heading.focus();
          };
          validateLogo();
        } else {
          //remove file from input
          input_img.value = '';
        }
      }
    }
  }

  /**
   * Utilities
   */
  const fileTypes = ["image/png"];

  function validFileType(file) {
    return fileTypes.includes(file.type);
  }

  function returnFileSize(number) {
    if (number < 1024) {
      return `${number} bytes`;
    } else if (number >= 1024 && number < 1048576) {
      return `${(number / 1024).toFixed(1)} KB`;
    } else if (number >= 1048576) {
      return `${(number / 1048576).toFixed(1)} MB`;
    }
  }

  function validateForm(event) {
    const brandName = input_brandname.value.trim();
    const image = input_img.value.length > 0;

    validateBrand();
    validateLogo();
    
    if (!brandName || !image) {

      // set focus on the first input with an error
      if (!brandName) {
        input_brandname.focus();
      } else {
        input_img.focus();
      }
      if (event) {
        event.preventDefault();
      }
    } 
  }

  function validateBrand() {
    const brandName = input_brandname.value.trim();
    
    if (!brandName) {
      if (!brand_name_group.classList.contains('form-group-error')) { // dont display the error more than once
        brand_name_group.classList.add('form-group-error');
        input_brandname.insertAdjacentHTML('beforebegin', brand_error_html);
      }
    } else {
      if (brand_name_group.classList.contains('form-group-error')) {
        brand_name_group.classList.remove('form-group-error');
        document.getElementById('name-error-message').remove();
      }
    }
  }

  function validateLogo() {
    const image = input_img.value.length > 0;

    if (!image) {
      if (!image_label.classList.contains('form-group-error')) { // dont display the error more than once
        image_label.classList.add('form-group-error');
        image_label.insertAdjacentHTML('beforebegin', image_error_html);
      }
    }
    else {
      if (image_label.classList.contains('form-group-error')) {
        image_label.classList.remove('form-group-error');
        document.getElementById('logo-error-message').remove();
      }
    }
  }
})();
