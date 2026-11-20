(function () {
  "use strict";

  const maxLogoWidth = 600;
  const maxLogoHeight = 108;
  const logoScale = 1;

  async function createPngWithinLimits(pngDataUrl) {
    const prefix = "data:image/png;base64,";
    if (!pngDataUrl.startsWith(prefix)) {
      throw new Error("PNG export did not return a base64 PNG data URL");
    }

    const encodedPng = pngDataUrl.slice(prefix.length);
    if (!encodedPng) {
      throw new Error("PNG export returned an empty image");
    }

    const image = new Image();
    image.src = pngDataUrl;
    await image.decode();

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("PNG export has invalid dimensions");
    }

    const scale = Math.min(
      logoScale,
      maxLogoWidth / image.naturalWidth,
      maxLogoHeight / image.naturalHeight,
    );
    const artworkWidth = Math.max(1, Math.floor(image.naturalWidth * scale));
    const artworkHeight = Math.max(1, Math.floor(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = maxLogoWidth;
    canvas.height = maxLogoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not resize the generated PNG");
    }
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, artworkWidth, artworkHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not create the resized PNG"));
        }
      }, "image/png");
    });
  }

  const signature = document.querySelector("#fip-signature");
  const fileInput = document.querySelector('[data-module="file-upload"] .file-upload-field');
  const generateButton = document.querySelector("#fip-generate-logo");
  const errorMessage = document.querySelector("#fip-generator-error");

  if (!signature || !fileInput || !generateButton || !errorMessage) {
    throw new Error("FIP branding generator markup is incomplete");
  }

  [
    ["#fip-text-en", "text-en"],
    ["#fip-text-fr", "text-fr"],
    ["#fip-symbol", "symbol"],
    ["#fip-lang-order", "lang-order"],
  ].forEach(([selector, attribute]) => {
    const control = document.querySelector(selector);
    control.addEventListener("input", () => {
      signature.setAttribute(attribute, control.value);
    });
    control.addEventListener("change", () => {
      signature.setAttribute(attribute, control.value);
    });
  });

  generateButton.addEventListener("click", async () => {
    generateButton.disabled = true;
    errorMessage.hidden = true;
    errorMessage.classList.remove("error-message");
    errorMessage.textContent = "";

    try {
      const signatureContainer = signature.shadowRoot?.querySelector(".fip-container");
      if (!signatureContainer) {
        throw new Error("FIP signature preview is not ready");
      }

      const originalWidth = signatureContainer.style.width;
      signatureContainer.style.width = "max-content";
      let pngDataUrl;
      try {
        pngDataUrl = await signature.exportPng();
      } finally {
        signatureContainer.style.width = originalWidth;
      }

      const png = await createPngWithinLimits(pngDataUrl);
      const generatedFile = new File([png], "fip-logo.png", { type: "image/png" });
      const transfer = new DataTransfer();
      transfer.items.add(generatedFile);
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) {
      console.error("Failed to generate FIP logo", error);
      errorMessage.classList.add("error-message");
      const detail = error instanceof Error ? error.message : String(error);
      errorMessage.textContent = `${errorMessage.dataset.errorMessage} ${detail}`;
      errorMessage.hidden = false;
    } finally {
      generateButton.disabled = false;
    }
  });
})();
