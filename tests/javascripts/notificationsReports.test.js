var hrefQueryParams = '';
const { location } = window;
const getHrefSpy = jest.fn(() => 'http://jobs-list?status=failed');
const setHrefSpy = jest.fn(href => { hrefQueryParams = href.search});


beforeAll(() => {
  delete window.location;
  window.location = {};
  Object.defineProperty(window.location, 'href', {
    get: getHrefSpy,
    set: setHrefSpy,
  });
  window.location.search = location.search;
});

afterAll(() => {
  window.location = location;
  require('./support/teardown.js');
});

describe('notification reports', () => {
  beforeEach(() => {
    // set up DOM
    document.body.innerHTML =
      `<div>
        <h2 class="heading-medium">Filters</h2>
        <div class="multiple-choice"> <input id="pe_filter" name="pe_filter" type="checkbox" value="y"> <label
            for="pe_filter">
            Only show problem addresses </label>
        </div>
      </div>`;

      require('../../app/assets/javascripts/notificationsReports.js');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('clicking filter checkbox redirects page', () => {
    // start module
    window.GOVUK.modules.start();

    var checkbox = document.querySelector('#pe_filter');

    // ensure page reloads with correct params when checkbox is checked
    checkbox.setAttribute('checked', true)
    $('#pe_filter').trigger('change');
    expect(hrefQueryParams).toEqual('?pe_filter=true&status=permanent-failure');

    // ensure page reloads with correct params when checkbox is unchecked
    checkbox.removeAttribute('checked')
    $('#pe_filter').trigger('change');
    expect(hrefQueryParams).toEqual('?status=');
  });

});
