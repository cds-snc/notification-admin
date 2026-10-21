import React from "react";
import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
import SimpleEditor from "../../../../../../app/assets/javascripts/tiptap/SimpleEditor";

const mountSmsEditor = (initialContent = "") => {
  cy.mount(
    <div>
      <label id="rte-label">Template content</label>
      <input type="hidden" id="template-content" value={initialContent} />
      <input type="hidden" id="template-content_mode" value="rte" />
      <SimpleEditor
        inputId="template-content"
        labelId="rte-label"
        initialContent={initialContent}
        lang="en"
        modeInputId="template-content_mode"
        initialMode="rte"
        templateType="sms"
      />
    </div>,
  );
};

const storedValue = () => cy.get("input#template-content");

describe("SMS plain text serialization", () => {
  it("stores typed markdown and HTML characters verbatim", () => {
    mountSmsEditor();

    RichTextEditor.Components.Editor()
      .click()
      .type(
        "# heading{enter}- item{enter}* item{enter}> quote{enter}**bold** and _italic_{enter}1. <b>tag</b> & \\escaped",
        { delay: 0, parseSpecialCharSequences: true },
      );

    RichTextEditor.Components.Editor()
      .find("h1, h2, ul, ol, blockquote, strong, em")
      .should("not.exist");

    storedValue().should(
      "have.value",
      "# heading\n\n- item\n\n* item\n\n> quote\n\n**bold** and _italic_\n\n1. <b>tag</b> & \\escaped",
    );
  });

  it("round-trips existing content with literal markdown, backslashes and entities unchanged", () => {
    const content =
      "# not a heading\n- not a list\n> not a quote\n**not bold** _not italic_\nC:\\#1 \\*star\\* &amp; &gt; <b>raw</b>";

    mountSmsEditor(content);

    RichTextEditor.Components.Editor().should("contain.text", "\\*star\\*");
    storedValue().should("have.value", content);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should("have.value", content);
  });

  it("still serializes variables and conditionals", () => {
    const content =
      "Hi ((first_name)), see you.\n\n((vip??*VIP* parking #1)) on site.\n\n((balance??\nPay #1 now.\n\n))";

    mountSmsEditor(content);

    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 1);
    RichTextEditor.Components.Editor()
      .find('[data-type="conditional-inline"]')
      .should("have.attr", "data-condition", "vip");
    RichTextEditor.Components.Editor()
      .find('[data-type="conditional"]')
      .should("have.attr", "data-condition", "balance");
    storedValue().should("have.value", content);
  });
});
