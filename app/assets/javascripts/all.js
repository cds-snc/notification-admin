/**
 * Legacy JS bundle entry — replaces Gulp's javascripts() task.
 *
 * Files are imported in the exact order that Gulp concatenated them.
 * globals.js is imported FIRST so that window.DiffDOM, window.polyglot etc.
 * are set before any legacy file's module-level code runs.
 */

// ── Globals (must be first — legacy files access window.* at module scope) ─
import "./globals.js";

// ── govuk_frontend_toolkit ────────────────────────────────────────────────
import "./govuk-modules.js";

// ── Application JS (same order as Gulp) ───────────────────────────────────
import "./utils.js";
import "./webpackLoader.js";
import "./stick-to-window-when-scrolling.js";
import "./apiKey.js";
import "./fido2.js";
import "./autocomplete.js";
import "./contactSanitizePii.js";
import "./highlightTags.js";
import "./fileUpload.js";
import "./updateContent.js";
import "./listEntry.js";
import "./liveSearch.js";
import "./preventDuplicateFormSubmissions.js";
import "./fullscreenTable.js";
import "./previewPane.js";
import "./colourPreview.js";
import "./templateFolderForm.js";
import "./collapsibleCheckboxes.js";
import "./moreMenu.js";
import "./menu.js";
import "./scopeTabNavigation.js";
import "./url-typer.js";
import "./notificationsReports.js";
import "./main.js";
import "./templateCategories.js";
import "./templateContent.js";
import "./smsCharacterInfo.js";
import "./reportFooter.js";
