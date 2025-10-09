describe("Email Preview Accessibility", () => {
  describe("Email from settings page", () => {
    test("The preview div should have aria-live='polite' attribute", () => {
      document.body.innerHTML = `
        <div id="preview" class="focus:outline-yellow mb-gutter" tabindex="0" aria-live="polite">
          <div class="bg-gray-100 border-l-2 border-gray-400 p-gutterHalf space-y-gutterHalf">
            <p class="m-0">Check that your email address is formatted correctly.</p>
            <p class="m-0">
              Your service's email address will be: 
              <b><span id='fixed-email-address'>test</span>@notification.canada.ca</b>
            </p>
          </div>
        </div>`;

      const previewDiv = document.querySelector("#preview");
      expect(previewDiv.getAttribute("aria-live")).toEqual("polite");
    });
  });

  describe("Create service page", () => {
    test("The preview div should have aria-live='polite' attribute", () => {
      document.body.innerHTML = `
        <div id="preview" class="focus:outline-yellow" style="display: none" tabindex="0" aria-live="polite">
          <div class="bg-gray-100 border-l-2 border-gray-400 p-gutterHalf space-y-gutterHalf">
            <p class="m-0">Check that your email address is formatted correctly.</p>
            <p class="m-0">
              Your service's email address will be: 
              <b><span id='fixed-email-address'></span>@notification.canada.ca</b>
            </p>
          </div>
        </div>`;

      const previewDiv = document.querySelector("#preview");
      expect(previewDiv.getAttribute("aria-live")).toEqual("polite");
    });
  });
});
