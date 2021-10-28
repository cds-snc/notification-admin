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
  "all_team members": "All team members",
  "choose_team members": "Choose team members",
  no_folders_only_outside_folder:
    "No folders (only templates outside a folder)",
  selection_of_total_folder: "%{smart_count} of %{total} folders",
  no_team_member_only_you: "No team members (only you)",
  "selection_of_total_team member": "%{smart_count} of %{total} team members",
  no_fields: "No %{field}s",
  done: "Done",
};

var Polyglot = require("node-polyglot");

window.polyglot = new Polyglot({ phrases: APP_PHRASES, locale: APP_LANG });
