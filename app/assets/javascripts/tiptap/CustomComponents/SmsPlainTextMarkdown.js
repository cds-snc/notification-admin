import { Extension } from "@tiptap/core";
import Text from "@tiptap/extension-text";

// SMS supports no markdown formatting at all (no headings, emphasis, lists,
// blockquotes, rules, links, code or raw HTML) - only variables and
// conditionals, which are parsed by their own custom markdown-it rules and
// are unaffected by disabling these built-in ones. Without this, markdown-it
// would silently consume characters like #, *, _, -, > as syntax markers
// even though the schema has nowhere to put the resulting formatting,
// corrupting existing plain-text SMS content that happens to contain them.
// `escape` and `entity` are disabled too so that backslashes and HTML
// entities (e.g. `\#`, `&amp;`) are kept as typed rather than decoded.
const STRUCTURAL_MARKDOWN_RULES = [
  "table",
  "code",
  "fence",
  "blockquote",
  "hr",
  "list",
  "reference",
  "html_block",
  "heading",
  "lheading",
  "linkify",
  "backticks",
  "strikethrough",
  "emphasis",
  "link",
  "image",
  "autolink",
  "html_inline",
  "escape",
  "entity",
];

// SMS content is sent verbatim, so text must be serialized exactly as typed.
// The default tiptap-markdown text serializer HTML-escapes `<`/`>` and
// markdown-escapes characters like #, -, *, _ with backslashes, which would
// then show up in the delivered text message.
export const SmsText = Text.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          state.text(node.text, false);
        },
        parse: {
          // handled by markdown-it
        },
      },
    };
  },
});

export default Extension.create({
  name: "smsPlainTextMarkdown",

  addStorage() {
    return {
      markdown: {
        parse: {
          setup(markdownit) {
            markdownit.disable(STRUCTURAL_MARKDOWN_RULES, true);
          },
        },
      },
    };
  },
});
