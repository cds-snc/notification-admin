const helpers = require('./support/helpers.js');

beforeAll(() => {
  // Set up window.utils with emailSafe function
  window.utils = {
    emailSafe: (string) => {
      // Simplified version for testing - just lowercase
      return string.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }
  };
  
  require('../../app/assets/javascripts/url-typer.js');
});

afterAll(() => {
  require('./support/teardown.js');
});

describe('URL Typer (Email Preview)', () => {

  let input;
  let preview;
  let emailAddress;

  beforeEach(() => {
    // Set up DOM for create service page
    document.body.innerHTML = `
      <div data-module="url-typer" class="form-wrap">
        <input id="email_from" type="text" name="email_from" value="">
        <div id="preview" class="focus:outline-yellow" style="display: none" tabindex="0" aria-live="polite">
          <div class="bg-gray-100 border-l-2 border-gray-400 p-gutterHalf space-y-gutterHalf">
            <p class="m-0">Check that your email address is formatted correctly.</p>
            <p class="m-0">
              Your service's email address will be: 
              <b><span id='fixed-email-address'></span>@notification.canada.ca</b>
            </p>
          </div>
        </div>
      </div>`;

    input = document.querySelector('input#email_from');
    preview = document.querySelector('#preview');
    emailAddress = document.querySelector('#fixed-email-address');

    // Start the module
    window.GOVUK.modules.start();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe("When the page loads", () => {

    test("Preview should be hidden initially", () => {
      expect(preview.style.display).toEqual('none');
    });

    test("Preview should have aria-live attribute", () => {
      expect(preview.getAttribute('aria-live')).toEqual('polite');
    });

  });

  describe("When user types in the email input", () => {

    test("Preview should become visible when input has value", () => {
      input.value = 'test';
      helpers.triggerEvent(input, 'keyup');
      
      expect(preview.style.display).not.toEqual('none');
    });

    test("Email address span should update with sanitized input", () => {
      input.value = 'my-email';
      helpers.triggerEvent(input, 'keyup');
      
      expect(emailAddress.textContent).toEqual('my-email');
    });

    test("Email address should be sanitized using emailSafe", () => {
      input.value = 'My Email!';
      helpers.triggerEvent(input, 'keyup');
      
      // Should be lowercase and special chars removed
      expect(emailAddress.textContent).toEqual('myemail');
    });

    test("Preview should hide when input is cleared", () => {
      // First, show the preview
      input.value = 'test';
      helpers.triggerEvent(input, 'keyup');
      expect(preview.style.display).not.toEqual('none');
      
      // Then clear the input
      input.value = '';
      helpers.triggerEvent(input, 'keyup');
      
      expect(preview.style.display).toEqual('none');
    });

  });

  describe("Accessibility", () => {

    test("Preview container should maintain aria-live attribute after updates", () => {
      input.value = 'test';
      helpers.triggerEvent(input, 'keyup');
      
      // Verify aria-live is still present after showing preview
      expect(preview.getAttribute('aria-live')).toEqual('polite');
    });

    test("Email address updates should not re-render entire container", () => {
      // Show preview first
      input.value = 'test';
      helpers.triggerEvent(input, 'keyup');
      
      // Get reference to the paragraph element
      const paragraph = preview.querySelector('p.m-0');
      const paragraphRef = paragraph;
      
      // Update email
      input.value = 'updated';
      helpers.triggerEvent(input, 'keyup');
      
      // Verify the paragraph element is still the same reference (not re-rendered)
      expect(preview.querySelector('p.m-0')).toBe(paragraphRef);
    });

  });

});
