import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Editor accessibility tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
  });

  it("Editor has appropriate role and aria-label", () => {
    RichTextEditor.Components.Editor().should("have.attr", "role", "textbox");
    RichTextEditor.Components.Editor().should("have.attr", "aria-labelledby");
    RichTextEditor.Components.Editor().should("have.attr", "aria-multiline");
    RichTextEditor.Components.Editor().should("not.be.empty");
  });
});

describe("Line break preservation", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
  });

  it("preserves single and double line breaks when toggling between markdown and editor view", () => {
    const markdownContent = `line1
line2

line3

line4`;

    // Switch to markdown view
    RichTextEditor.Components.ViewMarkdownButton().click();
    
    // Type the markdown content with line breaks
    RichTextEditor.Components.MarkdownEditor().clear().type(markdownContent, { delay: 0 });
    
    // Switch back to editor view
    RichTextEditor.Components.ViewMarkdownButton().click();
    
    // Get the editor HTML and verify the structure
    RichTextEditor.Components.Editor().then(($editor) => {
      const html = $editor.html();
      
      // Expect: <p>line1<br>line2</p><p>line3</p><p>line4</p>
      // Single newline becomes <br>, double newline creates new <p>
      expect(html).to.include("line1<br");
      expect(html).to.include("line2");
      expect(html).to.include("line3");
      expect(html).to.include("line4");
      
      // Verify the paragraph structure
      const paragraphs = $editor.find("p");
      expect(paragraphs).to.have.length(3);
      
      // First paragraph should contain line1<br>line2
      expect(paragraphs[0].innerHTML).to.include("line1");
      expect(paragraphs[0].innerHTML).to.include("<br");
      expect(paragraphs[0].innerHTML).to.include("line2");
      
      // Second paragraph should contain line3
      expect(paragraphs[1].innerHTML).to.include("line3");
      
      // Third paragraph should contain line4
      expect(paragraphs[2].innerHTML).to.include("line4");
    });
  });

  it("round-trips markdown without corruption", () => {
    const markdownContent = `line1
line2

line3`;

    // Switch to markdown view
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().clear().type(markdownContent, { delay: 0 });
    
    // Switch to editor and back to markdown multiple times
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.ViewMarkdownButton().click();
    
    // Verify markdown is still clean (no backslashes or extra blank lines)
    RichTextEditor.Components.MarkdownEditor().then(($textarea) => {
      const content = $textarea.val();
      
      // Should not contain backslashes from HardBreak serialization
      expect(content).not.to.include("\\");
      
      // Should have the original structure
      expect(content).to.include("line1\nline2");
      expect(content).to.include("\n\nline3");
    });
  });

  it("handles pasting plain text with line breaks", () => {
    const plainText = `line1
line2

line3

line4`;

    // Click in the editor
    RichTextEditor.Components.Editor().click();
    
    // Paste the plain text
    RichTextEditor.Components.Editor().then(($editor) => {
      cy.wrap($editor).trigger('paste', {
        clipboardData: {
          getData: () => plainText,
          types: ['text/plain']
        }
      });
    });
    
    // Verify the structure in the editor
    RichTextEditor.Components.Editor().then(($editor) => {
      const html = $editor.html();
      
      // Should have proper paragraph and line break structure
      const paragraphs = $editor.find("p");
      expect(paragraphs.length).to.be.greaterThan(0);
      
      // First paragraph should have a line break
      expect(paragraphs[0].innerHTML).to.include("<br");
    });
  });

  it("handles pasting markdown with variables and line breaks", () => {
    const markdownWithVars = `line1 ((email))
line2

line3`;

    // Click in the editor
    RichTextEditor.Components.Editor().click();
    
    // Paste the markdown with variables
    RichTextEditor.Components.Editor().then(($editor) => {
      cy.wrap($editor).trigger('paste', {
        clipboardData: {
          getData: () => markdownWithVars,
          types: ['text/plain']
        }
      });
    });
    
    // Verify the content was inserted
    RichTextEditor.Components.Editor().then(($editor) => {
      const html = $editor.html();
      
      // Should contain the text
      expect(html).to.include("line1");
      expect(html).to.include("line2");
      expect(html).to.include("line3");
      
      // Should have variable spans
      expect(html).to.include('data-type="variable"');
      expect(html).to.include("email");
    });
  });

  it("copies editor content without backslash artifacts", () => {
    const markdownContent = `line1
line2

line3`;

    // Switch to markdown view
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().clear().type(markdownContent, { delay: 0 });
    
    // Switch to editor
    RichTextEditor.Components.ViewMarkdownButton().click();
    
    // Get the hidden input which is what gets copied
    cy.getByTestId('editor-content-input').then(($input) => {
      const copiedContent = $input.val();
      
      // Should not contain backslashes
      expect(copiedContent).not.to.include("\\");
      
      // Should have the correct line break structure
      expect(copiedContent).to.include("line1\nline2");
      expect(copiedContent).to.include("\n\nline3");
    });
  });
});
