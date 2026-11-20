describe("FIP branding generator", () => {
  let fileInput;
  let selectedFiles;
  let previousDataTransfer;
  let previousImage;
  let previousCanvasGetContext;
  let previousCanvasToBlob;
  let canvasDimensions;
  let artworkDimensions;
  let imageDimensions;

  beforeEach(() => {
    document.body.innerHTML = `
      <form data-module="file-upload">
        <input class="file-upload-field" type="file">
      </form>
      <textarea id="fip-text-en"></textarea>
      <textarea id="fip-text-fr"></textarea>
      <select id="fip-symbol"></select>
      <select id="fip-lang-order"></select>
      <div id="fip-signature"></div>
      <p id="fip-generator-error" data-error-message="The logo could not be generated." hidden></p>
      <button id="fip-generate-logo" type="button"></button>
    `;

    fileInput = document.querySelector(".file-upload-field");
    selectedFiles = [];
    canvasDimensions = null;
    artworkDimensions = null;
    imageDimensions = { width: 940, height: 115 };
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      get: () => selectedFiles,
      set: (files) => {
        selectedFiles = files;
      },
    });

    previousDataTransfer = global.DataTransfer;
    global.DataTransfer = class {
      constructor() {
        this._files = [];
        this.items = { add: (file) => this._files.push(file) };
      }

      get files() {
        return this._files;
      }
    };

    const signature = document.querySelector("#fip-signature");
    signature.attachShadow({ mode: "open" });
    const signatureContainer = document.createElement("div");
    signatureContainer.className = "fip-container";
    Object.defineProperty(signatureContainer, "style", {
      configurable: true,
      value: { width: "100%" },
    });
    signature.shadowRoot.appendChild(signatureContainer);

    previousImage = global.Image;
    global.Image = class {
      get naturalWidth() {
        return imageDimensions.width;
      }

      get naturalHeight() {
        return imageDimensions.height;
      }

      decode() {
        return Promise.resolve();
      }

      set src(value) {
        this.dataUrl = value;
      }
    };

    previousCanvasGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
    previousCanvasToBlob = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "toBlob");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => ({
        fillRect: jest.fn(),
        drawImage: (image, x, y, width, height) => {
          artworkDimensions = { x, y, width, height };
        },
      }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
      configurable: true,
      value: function (callback, type) {
        canvasDimensions = { width: this.width, height: this.height };
        callback(new Blob(["resized"], { type }));
      },
    });

  });

  afterEach(() => {
    document.body.innerHTML = "";
    global.DataTransfer = previousDataTransfer;
    global.Image = previousImage;
    if (previousCanvasGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", previousCanvasGetContext);
    } else {
      delete HTMLCanvasElement.prototype.getContext;
    }
    if (previousCanvasToBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", previousCanvasToBlob);
    } else {
      delete HTMLCanvasElement.prototype.toBlob;
    }
    jest.resetModules();
  });

  test("updates the preview attributes from the generator controls", () => {
    require("../../app/assets/javascripts/fipBranding.js");

    const text = document.querySelector("#fip-text-en");
    text.value = "Department";
    text.dispatchEvent(new Event("input"));

    expect(document.querySelector("#fip-signature").getAttribute("text-en")).toBe("Department");
  });

  test("exports a PNG through the existing file uploader", async () => {
    const signature = document.querySelector("#fip-signature");
    const signatureContainer = signature.shadowRoot.querySelector(".fip-container");
    signature.exportPng = jest.fn().mockImplementation(() => {
      expect(signatureContainer.style.width).toBe("max-content");
      return Promise.resolve("data:image/png;base64,AAAA");
    });
    const changeHandler = jest.fn();
    fileInput.addEventListener("change", changeHandler);

    require("../../app/assets/javascripts/fipBranding.js");
    document.querySelector("#fip-generate-logo").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(signature.exportPng).toHaveBeenCalled();
    expect(selectedFiles[0]).toBeInstanceOf(File);
    expect(selectedFiles[0].name).toBe("fip-logo.png");
    expect(selectedFiles[0].type).toBe("image/png");
    expect(selectedFiles[0].size).toBe(7);
    expect(canvasDimensions).toEqual({ width: 600, height: 108 });
    expect(artworkDimensions).toEqual({ x: 0, y: 0, width: 470, height: 57 });
    expect(signatureContainer.style.width).toBe("100%");
    expect(changeHandler).toHaveBeenCalled();
  });

  test("keeps the fixed artboard and scales multiline signatures to 50%", async () => {
    imageDimensions = { width: 540, height: 162 };
    const signature = document.querySelector("#fip-signature");
    signature.exportPng = jest.fn().mockResolvedValue("data:image/png;base64,AAAA");

    require("../../app/assets/javascripts/fipBranding.js");
    document.querySelector("#fip-generate-logo").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(selectedFiles[0]).toBeInstanceOf(File);
    expect(selectedFiles[0].size).toBe(7);
    expect(canvasDimensions).toEqual({ width: 600, height: 108 });
    expect(artworkDimensions).toEqual({ x: 0, y: 0, width: 270, height: 81 });
  });

  test("scales further when the 50% signature would exceed the artboard", async () => {
    imageDimensions = { width: 1600, height: 270 };
    const signature = document.querySelector("#fip-signature");
    signature.exportPng = jest.fn().mockResolvedValue("data:image/png;base64,AAAA");

    require("../../app/assets/javascripts/fipBranding.js");
    document.querySelector("#fip-generate-logo").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(canvasDimensions).toEqual({ width: 600, height: 108 });
    expect(artworkDimensions).toEqual({ x: 0, y: 0, width: 600, height: 101 });
  });

  test("shows an error when export does not return a PNG data URL", async () => {
    const signature = document.querySelector("#fip-signature");
    signature.exportPng = jest.fn().mockResolvedValue("data:image/jpeg;base64,AAAA");
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    require("../../app/assets/javascripts/fipBranding.js");
    document.querySelector("#fip-generate-logo").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const errorMessage = document.querySelector("#fip-generator-error");
    expect(errorMessage.hidden).toBe(false);
    expect(errorMessage.textContent).toContain("base64 PNG data URL");
    expect(selectedFiles).toHaveLength(0);
    consoleError.mockRestore();
  });

  test("shows an error when PNG export fails", async () => {
    const signature = document.querySelector("#fip-signature");
    signature.exportPng = jest.fn().mockRejectedValue(new Error("Export failed"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    require("../../app/assets/javascripts/fipBranding.js");
    document.querySelector("#fip-generate-logo").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const errorMessage = document.querySelector("#fip-generator-error");
    expect(errorMessage.hidden).toBe(false);
    expect(errorMessage.textContent).toContain("Export failed");
    consoleError.mockRestore();
  });
});
