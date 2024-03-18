/// <reference types="cypress" />

import { CreateAccountPage } from "../../Notify/Admin/Pages/AllPages";
import { Utilities, Admin } from "../../Notify/NotifyAPI";

describe('Create Account Page', () => {

  beforeEach(() => {
    CreateAccountPage.VisitPage();
  });

  // Clear cookies for the next suite of tests
  after(() => {
    cy.clearCookie('notify_admin_session');
  });

  it('Display the correct title', () => {
    cy.contains('h1', 'Create an account').should('be.visible');
  });

  it('Display error  when submitting an empty form', () => {
    CreateAccountPage.EmptySubmit();
    cy.contains('span', 'This cannot be empty').should('be.visible');
    cy.contains('span', 'Enter an email address').should('be.visible');
  });

  it('Display an error when submitting and invalid phone number and non-government email', () => {
    CreateAccountPage.Submit('John Doe', 'john.doe@not-a-gov-email.ca', '123', 'password123')
    cy.contains('span', "not-a-gov-email.ca is not on our list of government domains").should('be.visible');
    cy.contains('span', "Not a valid phone number").should('be.visible');
  });

  it('Display an error if password is shorter than 8 characters', () => {
    CreateAccountPage.Submit("john doe", "john.doe@cds-snc.ca", "1234567890", "1234567");
    cy.contains('span', 'Must be at least 8 characters').should('be.visible');
  });

  it('Display an error if password is not strong enough', () => {
    CreateAccountPage.Submit("john doe", "john.doe@cds-snc.ca", "1234567890", "123456789");
    cy.contains('span', 'A password that is hard to guess contains:').should('be.visible');
    cy.contains('li', 'Uppercase and lowercase letters.').should('be.visible');
    cy.contains('li', 'Numbers and special characters.').should('be.visible');
    cy.contains('li', 'Words separated by a space.').should('be.visible');
  });

  it('Succeeds with a valid form', () => {
    let email = `notify-ui-tests+${Utilities.GenerateID()}@cds-snc.ca`;

    CreateAccountPage.CreateAccount("john doe", email, "16132532223", "BestPassword123!");
    cy.contains('h1', 'Check your email').should('be.visible');
    cy.contains('p', `An email has been sent to ${email}.`).should('be.visible');

    CreateAccountPage.WaitForConfirmationEmail();
    // Ensure registration email is received and click registration link
    cy.contains('p', 'To complete your registration for GC Notify, please click the link:').should('be.visible');
    cy.get('a')
      .should('have.attr', 'href')
      .and('include', 'verify-email')
      .then((href) => {
        cy.visit(href);
      });

    cy.contains('h1', 'Check your phone messages').should('be.visible')

    Admin.GetUserByEmail({ email: email }).then((user) => {
      // TODO: Ideally we'd want the ability to completely delete the test user rather than archive it.
      Admin.ArchiveUser({ userId: user.body.data.id })
    });
  });

});
