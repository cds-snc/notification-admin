const storybookURL = "/_storybook";

describe("Storybook Components Accessibility Tests", () => {
  beforeEach(() => {
    cy.visit(storybookURL);
  });

  it("All components should be accessible", () => {
    // Find all component links under the Components heading
    cy.get('h1:contains("Components")')
      .next("ul")
      .find("a")
      .then(($links) => {
        // Convert links collection to array of href values
        const links = Array.from($links).map((link) => ({
          href: link.getAttribute("href"),
          name:
            link.textContent.trim() ||
            link.getAttribute("href").split("component=").pop(),
        }));

        // For each component link
        cy.wrap(links).each((component, index) => {
          // Create a more visible log message
          cy.log(
            `***** TESTING COMPONENT ${index + 1}/${links.length}: ${component.name} *****`,
          );

          // Visit the component
          cy.visit(component.href);

          // Run accessibility tests with component name in the options for better reporting
          cy.a11yScan(component.href, {
            a11y: true,
            htmlValidate: true,
            deadLinks: false,
            mimeTypes: false,
            label: component.name, // If your a11yScan command accepts a label option
          });

          // Log when component test is complete
          cy.log(`***** COMPLETED: ${component.name} *****`);
        });
      });
  });
});
