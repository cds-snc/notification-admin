/**
 * Establishes window globals that legacy scripts depend on at module eval time.
 *
 * This module is imported FIRST in all.js so that by the time any legacy file
 * is evaluated, all globals are already on window.
 */
import Hogan from "hogan.js";
import $ from "jquery";
import "jquery-migrate";
import Moment from "moment";
import { DiffDOM } from "diff-dom";
import Polyglot from "node-polyglot";
import getCaretCoordinates from "textarea-caret";
import accessibleAutocomplete from "accessible-autocomplete";
import { sanitizePii } from "@cdssnc/sanitize-pii";

window.Hogan = Hogan;
window.$ = $;
window.jQuery = $;
// Suppress jquery-migrate console warnings — parity with old Gulp pipeline
// which used the minified build that has logging disabled by default.
$.migrateMute = true;
window.moment = Moment;
window.DiffDOM = DiffDOM;
window.accessibleAutocomplete = accessibleAutocomplete;
window.getCaretCoordinates = getCaretCoordinates;
window.sanitizePii = sanitizePii;

// APP_PHRASES and APP_LANG are injected by Flask into the page before this script runs
if (!window.APP_PHRASES || typeof APP_PHRASES === "undefined") {
  window.APP_PHRASES = { now: "Now" };
}
if (!window.APP_LANG || typeof APP_LANG === "undefined") {
  window.APP_LANG = "en";
}
window.polyglot = new Polyglot({
  phrases: window.APP_PHRASES,
  locale: window.APP_LANG,
});
