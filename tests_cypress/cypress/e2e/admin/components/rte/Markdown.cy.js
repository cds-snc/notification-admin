import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

import MARKDOWN from "../../../../fixtures/markdownSamples.js";

describe.only("Markdown entering and pasting tests", () => {
    beforeEach(() => {
        const startTime = Date.now();
        
        // Load the editor (will use global pageLoadTimeout from config)
        cy.visit(RichTextEditor.URL).then(() => {
            cy.log(`Page loaded in ${Date.now() - startTime}ms`);
        });

        // Ensure toolbar is ready for interactions
        RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

        // Ensure editor is mounted and ready
        RichTextEditor.Components.Editor().should("exist", { timeout: 10000 });

        // Wait for initial default content, then clear robustly
        RichTextEditor.Components.Editor()
            .should("contain.text", "Welcome to the Editor")
            .click("topLeft")
            .type("{selectall}{del}{del}");

        // Assert default content is gone and editor is empty (Cypress will retry these)
        RichTextEditor.Components.Editor()
            .should("not.contain.text", "Welcome to the Editor")
            .and("have.text", "")
            .then(() => {
                cy.log(`beforeEach completed in ${Date.now() - startTime}ms`);
            });
    });

    it("Correctly renders markdown for Headings", () => {
        RichTextEditor.Components.Editor().type(MARKDOWN.HEADINGS.before);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.HEADINGS.expected);

        // pasting
        // RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
        // RichTextEditor.Components.MarkdownEditor().should("have.text", "");
        // RichTextEditor.Components.MarkdownEditor().paste(MARKDOWN.HEADINGS.expected);

        // // ensure markdown is correct
        // RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.HEADINGS.expected);
        // switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.HEADINGS.expected);
    });

    it("Correctly renders markdown for Variables", () => {
        RichTextEditor.Components.Editor().type(MARKDOWN.VARIABLES.before);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.VARIABLES.expected);

        // pasting
        // RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
        // RichTextEditor.Components.MarkdownEditor().should("have.text", "");
        // RichTextEditor.Components.MarkdownEditor().paste(MARKDOWN.VARIABLES.expected);

        // // ensure markdown is correct
        // RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.VARIABLES.expected);
        // switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.VARIABLES.expected);
    });

    it("Correctly renders markdown for Text Styles", () => {
        RichTextEditor.Components.Editor().type(MARKDOWN.TEXT_STYLES.before);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.TEXT_STYLES.expected);

        // pasting
        // RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
        // RichTextEditor.Components.MarkdownEditor().should("have.text", "");
        // RichTextEditor.Components.MarkdownEditor().paste(MARKDOWN.TEXT_STYLES.expected);

        // // ensure markdown is correct
        // RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.TEXT_STYLES.expected);
        // switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.TEXT_STYLES.expected);
    });

    it("Correctly renders markdown for List Styles", () => {
        RichTextEditor.Components.Editor().type(MARKDOWN.LIST_STYLES.before);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LIST_STYLES.expected);

        // pasting
        // RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
        // RichTextEditor.Components.MarkdownEditor().should("have.text", "");
        // RichTextEditor.Components.MarkdownEditor().paste(MARKDOWN.LIST_STYLES.expected);

        // // ensure markdown is correct
        // RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LIST_STYLES.expected);
        // switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LIST_STYLES.expected);
    });

    it("Correctly renders markdown for Links", () => {
        RichTextEditor.Components.Editor().type(MARKDOWN.LINKS.before);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LINKS.expected);

        // pasting
        // RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
        // RichTextEditor.Components.MarkdownEditor().should("have.text", "");
        // RichTextEditor.Components.MarkdownEditor().paste(MARKDOWN.LINKS.expected);

        // // ensure markdown is correct
        // RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LINKS.expected);
        // switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LINKS.expected);
    });

    it("Correctly renders markdown for Lang Blocks", () => {
        RichTextEditor.Components.Editor().type(MARKDOWN.LANG_BLOCKS.before);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LANG_BLOCKS.expected);

        // pasting
        // RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
        // RichTextEditor.Components.MarkdownEditor().should("have.text", "");
        // RichTextEditor.Components.MarkdownEditor().paste(MARKDOWN.LANG_BLOCKS.expected);

        // // ensure markdown is correct
        // RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LANG_BLOCKS.expected);
        // switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", MARKDOWN.LANG_BLOCKS.expected);
    });
});
