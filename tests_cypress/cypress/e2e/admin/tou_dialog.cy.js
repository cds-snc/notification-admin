import RegisterPage from "../../Notify/Admin/Pages/RegisterPage";

describe("TOU Dialog", () => {
    beforeEach(() => {
        cy.visit('/register');
    });

    context('Trigger', () => {
        
        it('Shows as not-complete on initial load', () => {
            RegisterPage.Components.TOUStatusNotComplete().should('be.visible');
        });
        
        it('Remains as not-complete if user opens the dialog and clicks [cancel, ESC, close]', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Close();
            RegisterPage.Components.TOUStatusNotComplete().should('be.visible');

            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Cancel();
            RegisterPage.Components.TOUStatusNotComplete().should('be.visible');

            RegisterPage.Components.TOUTrigger().click();
            cy.get('body').type('{esc}');
            RegisterPage.Components.TOUStatusNotComplete().should('be.visible');
        });

        it('Updates to complete after clicking agree', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.AgreeToTerms();
            RegisterPage.Components.TOUStatusComplete().should('be.visible');
        });

        it('Displays error message/error summary if terms not agreed and user submits form', () => {
            RegisterPage.Continue();
            RegisterPage.Components.TOUErrorMessage().should('be.visible');
            RegisterPage.Components.TOUValidationSummaryErrorMessage().should('be.visible');
        });

        it('Error message/summary is removed after agreeing to terms and submitting the form', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.AgreeToTerms();
            RegisterPage.Continue();
            RegisterPage.Components.TOUErrorMessage().should('not.exist');
            RegisterPage.Components.TOUValidationSummaryErrorMessage().should('not.exist');
        });

        it('Can click on error summary and land on dialog trigger', () => {
            RegisterPage.Continue();
            RegisterPage.Components.TOUValidationSummaryErrorMessage().should('be.visible');
            RegisterPage.Components.TOUValidationSummaryErrorMessage().click();
            RegisterPage.Components.TOUTrigger().should('be.visible');
        });
    });
    
    
    context('Dialog', () => {
        //     - Dialog opens when trigger is clicked
        it('Opens when trigger is clicked', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Components.TOUDialog().should('be.visible');
        });

        it('has focus set to terms when dialog opens', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Components.TOUTerms().should('have.focus');
        });

        it('has agree button disabled when dialog opens', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Components.TOUAgree().should('be.disabled');
        });

        it('Enables agree button when user scrolls to bottom of terms', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.ScrollTerms();
            RegisterPage.Components.TOUAgree().should('not.be.disabled');
        });
        //     - Dialog closes if user clicks [cancel, ESC, close]
        it('Closes when user clicks cancel', () => {
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Cancel();
            RegisterPage.Components.TOUDialog().should('not.be.visible');
            RegisterPage.Components.TOUTrigger().should('have.focus');
            
            RegisterPage.Components.TOUTrigger().click();
            RegisterPage.Close();
            RegisterPage.Components.TOUDialog().should('not.be.visible');
            RegisterPage.Components.TOUTrigger().should('have.focus');

            RegisterPage.Components.TOUTrigger().click();
            cy.get('body').type('{esc}');
            RegisterPage.Components.TOUDialog().should('not.be.visible');
            RegisterPage.Components.TOUTrigger().should('have.focus');
        });
    });
   
    //     Accessibility
    //     - Page is accessible
    //     - Dialog is accessible via keyboard
});