import { Extension } from "@tiptap/core";

// SMS supports no markdown formatting at all (no headings, emphasis, lists,
// blockquotes, rules, links, code or raw HTML) - only variables and
// conditionals, which are parsed by their own custom markdown-it rules and
// are unaffected by disabling these built-in ones. Without this, markdown-it
// would silently consume characters like #, *, _, -, > as syntax markers
// even though the schema has nowhere to put the resulting formatting,
// corrupting existing plain-text SMS content that happens to contain them.
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
];

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
