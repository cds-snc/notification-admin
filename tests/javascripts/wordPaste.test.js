import fs from "fs";
import path from "path";
import { wordHtmlToMarkdown } from "../../app/assets/javascripts/tiptap/utils/wordPaste";

// Real text/html clipboard payload captured from Word for Mac
const wordMacHtml = fs.readFileSync(
  path.join(__dirname, "fixtures", "word-mac-clipboard.html"),
  "utf8",
);

describe("wordHtmlToMarkdown with a real Word clipboard payload", () => {
  const markdown = wordHtmlToMarkdown(wordMacHtml);

  test("converts the whole document", () => {
    expect(markdown).toBe(
      [
        "# Heading 1",
        "## Heading 2",
        "Hello **((na_me))!**",
        "This is a **bold test** and an *italics test*.",
        "This [is a link](https://www.google.ca/).",
        "- Item 1\n- Item 2",
        "1. Asfsa\n2. Asdasd\n3. Asd",
      ].join("\n\n"),
    );
  });

  test.each([
    ["heading 1", "# Heading 1"],
    ["heading 2", "## Heading 2"],
    ["bold", "**bold test**"],
    ["italics", "*italics test*"],
    ["link", "[is a link](https://www.google.ca/)"],
    ["variable (underscore not escaped)", "((na_me))"],
    ["bullet list", "- Item 1\n- Item 2"],
    ["numbered list", "1. Asfsa\n2. Asdasd\n3. Asd"],
  ])("includes %s", (_name, expected) => {
    expect(markdown).toContain(expected);
  });

  test("does not leak Word-specific markup", () => {
    expect(markdown).not.toMatch(/<|mso-|supportLists|StartFragment|&nbsp;/);
  });
});

describe("wordHtmlToMarkdown with other formatting", () => {
  test.each([
    ["bold via style", '<p><span style="font-weight:bold">a</span></p>', "**a**"],
    ["italics via style", '<p><span style="font-style:italic">a</span></p>', "*a*"],
    ["bold and italics", "<p><b><i>a</i></b></p>", "***a***"],
    [
      "mailto link",
      '<p><a href="mailto:a@b.ca">a@b.ca</a></p>',
      "[a@b.ca](mailto:a@b.ca)",
    ],
    [
      "link with bold text",
      '<p><a href="https://example.com"><b>a</b></a></p>',
      "[**a**](https://example.com)",
    ],
    ["bookmark without href", '<p><a name="_Toc1">a</a></p>', "a"],
    ["nested list", "<ul><li>a<ul><li>b</li></ul></li></ul>", "- a\n  - b"],
    ["heading 3 maps to heading 2", "<h3>a</h3>", "## a"],
    ["line break", "<p>a<br>b</p>", "a\nb"],
    ["blockquote", "<blockquote><p>a</p></blockquote>", "> a"],
    ["underline is dropped", "<p><u>a</u></p>", "a"],
    ["markdown characters are escaped", "<p>2 * 3 [x]</p>", "2 \\* 3 \\[x\\]"],
    ["empty semantic list item is skipped", "<ol><li></li><li>a</li></ol>", "2. a"],
  ])("%s", (_name, html, expected) => {
    expect(wordHtmlToMarkdown(html)).toBe(expected);
  });

  test("skips empty Word list paragraphs", () => {
    const html = `
      <p style="mso-list:l1 level1 lfo2"><span style="mso-list:Ignore">1.</span> a</p>
      <p style="mso-list:l1 level1 lfo2"><span style="mso-list:Ignore">2.</span></p>`;
    expect(wordHtmlToMarkdown(html)).toBe("1. a");
  });

  test("returns an empty string for empty or non-string input", () => {
    expect(wordHtmlToMarkdown("")).toBe("");
    expect(wordHtmlToMarkdown(null)).toBe("");
  });
});
