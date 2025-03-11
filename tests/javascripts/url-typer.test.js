const helpers = require('./support/helpers');
require('@testing-library/jest-dom');

beforeAll(() => {
  // TODO: remove this when tests for sticky JS are written
  require('../../app/assets/javascripts/url-typer.js');
});

afterAll(() => {
  require('./support/teardown.js');
});
