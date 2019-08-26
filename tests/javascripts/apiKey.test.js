const helpers = require('./support/helpers');

afterAll(() => {

  require('./support/teardown.js');

  // clear up methods in the global space
  document.queryCommandSupported = undefined;

});

describe('API key', () => {

  let apiKey;
  let thing;
  let component;

  beforeEach(() => {

    apiKey = 'admin-service-6658542f-0cad-491f-bec8-ab8457700ead-53c0c274-8e83-48f1-8448-598657bb39af';
    thing = 'API key';

    // mock sticky JS
    window.GOVUK.stickAtBottomWhenScrolling = {
      recalculate: jest.fn(() => {})
    }

  });

  test("If copy command isn't available, nothing should happen", () => {

    // fake support for the copy command not being available
    document.queryCommandSupported = jest.fn(command => false);

    require('../../app/assets/javascripts/apiKey.js');

    // set up DOM
    document.body.innerHTML =`
      <h2 class="api-key-name">
        ${thing}
      </h2>
      <div data-module="api-key" data-key="${apiKey}" data-thing="${thing}" aria-live="assertive">
        <span class="api-key-key">${apiKey}</span>
      </div>`;

    component = document.querySelector('[data-module=api-key]');

    // start the module
    window.GOVUK.modules.start();

    expect(component.querySelector('input[type=button]')).toBeNull();

  });

  describe("If copy command is available", () => {

    let componentHeightOnLoad;

    beforeAll(() => {

      // assume copy command is available
      document.queryCommandSupported = jest.fn(command => command === 'copy');

      // force module require to not come from cache
      jest.resetModules();

      require('../../app/assets/javascripts/apiKey.js');

    });

    beforeEach(() => {

      // set up DOM
      document.body.innerHTML =`
        <h2 class="api-key-name">
          ${thing}
        </h2>
        <div data-module="api-key" data-key="${apiKey}" data-thing="${thing}" aria-live="assertive">
          <span class="api-key-key">${apiKey}</span>
        </div>`;

      component = document.querySelector('[data-module=api-key]');

      // mock DOM API called for element height
      componentHeightOnLoad = 50;
      jest.spyOn(component, 'offsetHeight', 'get').mockImplementation(() => componentHeightOnLoad);

      // start the module
      window.GOVUK.modules.start();

    });

    describe("On page load", () => {

      test("It should add a button for copying the key to the clipboard", () => {

        expect(component.querySelector('input[type=button]')).not.toBeNull();

      });

      test("It should add the 'api-key' class", () => {

        expect(component.classList.contains('api-key')).toBe(true);

      });

      test("It should change aria-live to 'polite'", () => {

        expect(component.getAttribute('aria-live')).toEqual('polite');

      });

      test("It should tell any sticky JS present the page has changed", () => {

        // recalculate forces the sticky JS to recalculate any stored DOM position/dimensions
        expect(window.GOVUK.stickAtBottomWhenScrolling.recalculate).toHaveBeenCalled();

      });

    });

    describe("If you click the 'Copy API key to clipboard' button", () => {

      let selectionMock;
      let rangeMock;
      let keyEl;
      let copyButton;

      beforeEach(() => {

        keyEl = component.querySelector('span');
        copyButton = component.querySelector('input[type=button]');

        // mock objects used to manipulate the page selection
        selectionMock = new helpers.SelectionMock(jest);
        rangeMock = new helpers.RangeMock(jest);

        // plug gaps in JSDOM's API for manipulation of selections
        window.getSelection = jest.fn(() => selectionMock);
        document.createRange = jest.fn(() => rangeMock);

        // plug JSDOM not having execCommand
        document.execCommand = jest.fn(() => {});

        helpers.triggerEvent(copyButton, 'click');

      });

      test("It should change the text to confirm the copy action", () => {

        expect(component.querySelector('span').textContent.trim()).toEqual('Copied to clipboard');

      });

      test("It should swap the button for one to show the API key", () => {

        expect(component.querySelector('input[type=button]').getAttribute('value')).toEqual('Show API key');

      });

      test("It should copy the key to the clipboard", () => {

        // it should make a selection (a range) from the contents of the element containing the API key
        expect(rangeMock.selectNodeContents.mock.calls[0]).toEqual([keyEl]);

        // that selection (a range) should be added to that for the page (a selection)
        expect(selectionMock.addRange.mock.calls[0]).toEqual([rangeMock]);

        expect(document.execCommand).toHaveBeenCalled();
        expect(document.execCommand.mock.calls[0]).toEqual(['copy']);

        // reset any methods in the global space
        window.queryCommandSupported = undefined;
        window.getSelection = undefined;
        document.createRange = undefined;

      });

      describe("If you then click the 'Show API key'", () => {

        beforeEach(() => {

          helpers.triggerEvent(component.querySelector('input[type=button]'), 'click');

        });

        test("It should change the text to show the API key", () => {

          expect(component.querySelector('span').textContent.trim()).toEqual(apiKey);

        });

        test("It should swap the button for one to copy the key to the clipboard", () => {

          expect(component.querySelector('input[type=button]').getAttribute('value')).toEqual('Copy API key to clipboard');

        })

      });

    });

  });

});
