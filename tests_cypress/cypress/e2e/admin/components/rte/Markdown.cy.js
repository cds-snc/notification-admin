import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

import { humanize } from "../../../../support/utils";

import MARKDOWN from "../../../../fixtures/markdownSamples.js";

describe.only("Markdown entering and pasting tests", () => {
    beforeEach(() => {
        // Load the editor (will use global pageLoadTimeout from config)
        cy.visit(RichTextEditor.URL);

        // Ensure toolbar is ready for interactions
        RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

        // Ensure editor is mounted and ready
        RichTextEditor.Components.Editor().should("exist", { timeout: 10000 });

        // ensure editor contains "Welcome to the editor" somewhere
                // Wait for initial default content, then clear robustly
                RichTextEditor.Components.Editor()
                    .should("contain.text", "Welcome to the Editor")
                    .click("topLeft")
                    .type("{selectall}{del}{del}");

                // Assert default content is gone and editor is empty (Cypress will retry these)
                RichTextEditor.Components.Editor()
                    .should("not.contain.text", "Welcome to the Editor")
                    .and("have.text", "");
    });

    Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
        it(`Correctly renders markdown for ${humanize(key)}`, () => {

            cy.realType(before, { delay: 1, pressDelay: 1 });
            // RichTextEditor.Components.Editor().type(before);

            RichTextEditor.Components.ViewMarkdownButton().click();
            // ensure markdown matches expected
            RichTextEditor.Components.MarkdownEditor().should("have.text", expected);

            // pasting
            RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
            RichTextEditor.Components.MarkdownEditor().should("have.text", "");
            RichTextEditor.Components.MarkdownEditor().paste(expected);

            // ensure markdown is correct
            RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
            // switch back to editor view and ensure no data loss
            RichTextEditor.Components.ViewMarkdownButton().click();
            RichTextEditor.Components.MarkdownEditor().should("not.exist");

            // switch back to markdown and ensure content is still correct
            RichTextEditor.Components.ViewMarkdownButton().click();
            RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
        });
    });
});
