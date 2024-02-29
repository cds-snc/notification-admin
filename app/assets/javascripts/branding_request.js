(function () {
    "use strict";
    const input_img = document.querySelector("input.file-upload-field");
    const input_brandname = document.querySelector("#name");
    const submit_button = document.querySelector("button[type=submit]");
    const message = document.querySelector(".preview .message");
    const image_slot = document.querySelector(".preview .img");
    const preview_heading = document.querySelector("#preview_heading");

    // init UI
    input_img.style.opacity = 0;
    setDisabled(submit_button, true);
    input_img.addEventListener("change", updateImageDisplay);
    input_brandname.addEventListener('keyup', enableSubmitButton);
    
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
                    const img = document.getElementById('template_preview').shadowRoot.querySelector('img');
                    img.src = img_src;

                    img.onload = () => {
                        message.textContent = `File name: ${file.name}, file size: ${returnFileSize(file.size)}, display size: ${img.naturalWidth} x ${img.naturalHeight}`;
                        document.querySelector('.template_preview').classList.remove('hidden');
                        preview_heading.focus();
                    };
                    
                    enableSubmitButton();
                } else {
                    message.textContent = `File name ${file.name}: Not a valid file type. Update your selection.`;
                }
            }
        }
    }
    
    /**
     * Utilities
     */
    const fileTypes = [
        "image/png",
    ];

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

    function setDisabled(elem, bool) {
      elem.disabled = bool;
      if (bool) {
        elem.classList.add("disabled");
      }
      else {
        elem.classList.remove("disabled");
      }
    }

    function enableSubmitButton() {
      const brandName = input_brandname.value.trim();
      const image = input_img.files.length > 0;

      if (brandName && image) {
        setDisabled(submit_button, false);
      }
      else {
        setDisabled(submit_button, true);
      }
    }
})();


