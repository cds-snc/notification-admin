/**
 * This script handles the functionality for the branding request form.
 * It initializes the UI, updates the email template preview based on the selected file,
 * and validates the form inputs (brand name and logo).
 *
 * Client-side validation:
 * ----------------------
 * Normally with file uploads, when you post a file it doesnt get returned back with  the form, so if we want to display
 * errors, we would have to either save the file temporarily (i.e. in s3) which is complex or force the user
 * to upload it twice, which isn't great UX.
 *
 * Instead, we do client-side validation so that the user can upload the file only once.
 *
 * Localisation:
 * ------------
 * This module uses the window.APP_PHRASES object to get the strings for the error messages, following the pattern of other
 * existing components.
 *
 */
(function () {
  "use strict";

  const input_img = document.querySelector("input.file-upload-field");
  const alt_en = document.getElementById("alt_text_en");
  const alt_fr = document.getElementById("alt_text_fr");
  const message = document.querySelector(".preview .message");
  const image_slot = document.querySelector(".preview .img");
  const preview_heading = document.querySelector("#preview_heading");
  const preview_container = document.querySelector(".template_preview");

  // init UI
  input_img.style.opacity = 0;
  input_img.addEventListener("change", updateImageDisplay);

  // strings
  let file_name = window.APP_PHRASES.branding_request_file_name;
  let file_size = window.APP_PHRASES.branding_request_file_size;
  let display_size = window.APP_PHRASES.branding_request_display_size;

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
      message.textContent = "No files currently selected for upload";
      preview_container.classList.add("hidden");
    } else {
      for (const file of curFiles) {
        if (validFileType(file)) {
          const img_src = URL.createObjectURL(file);
          const img = document
            .getElementById("template_preview")
            .shadowRoot.querySelector("img");
          img.src = encodeURI(img_src);
          img.alt = `${alt_en.value} / ${alt_fr.value}`;
          img.onload = () => {
            message.textContent = `${file_name} ${
              file.name
            }, ${file_size} ${returnFileSize(file.size)}, ${display_size} ${
              img.naturalWidth
            } x ${img.naturalHeight}`;
            preview_container.classList.remove("hidden");
            preview_heading.focus();
          };
        } else {
          //remove file from input
          input_img.value = "";
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
})();
