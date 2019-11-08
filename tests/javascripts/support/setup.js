// set up jQuery
window.jQuery = require("jquery");
$ = window.jQuery;

// load module code
require("govuk_frontend_toolkit/javascripts/govuk/modules.js");

// setting up translations
window.APP_LANG = "en";
window.APP_PHRASES = {
  copied_to_clipboard: "Copied to clipboard",
  show: "Show",
  copy: "Copy",
  to_clipboard: "to clipboard",
  add_another: "Add another",
  number: "number",
  remaining: "remaining",
  remove: "Remove",
  all_folders: "All folders",
  choose_folders: "Choose folders",
  all_teams: "All team members",
  choose_team: "Choose team members",
  "all_team members" : "All team members",
  "choose_team members" : "Choose team members"
};

var Polyglot = require("node-polyglot");

window.polyglot = new Polyglot({ phrases: APP_PHRASES, locale: APP_LANG });
