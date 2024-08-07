/// <reference types="cypress" />

import config from "../../../../config";
import { TemplatesPage as Page } from "../../../Notify/Admin/Pages/all";
import { Admin } from "../../../Notify/NotifyAPI";

// TODO: dont hardcode these
const templates =
    {
        smoke_test_email: { name: 'SMOKE_TEST_EMAIL', id: '5e26fae6-3565-44d5-bfed-b18680b6bd39' },
        smoke_test_email_attach: { name: 'SMOKE_TEST_EMAIL_ATTACH', id: 'bf85def8-01b4-4c72-98a8-86f2bc10f2a4' },
    };

describe("Edit template", () => {
    context("FF OFF", () => {
        // Override the process_type -> new process type should be saved for an existing template
        it("Should allow platform admin to override process type", () => {
            // login as admin
            cy.login(Cypress.env("NOTIFY_ADMIN_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);

            // set template priority to use TC
            Page.SelectTemplate(templates.smoke_test_email.name);
            Page.EditCurrentTemplate();
            Page.SetTemplatePriority('bulk')
            Page.SaveTemplate();

            // use api to check that it was set
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.equal('bulk');
            });

            // set template priority to normal
            Page.EditCurrentTemplate();
            Page.SetTemplatePriority('normal')
            Page.SaveTemplate();

            // use api to check that it was overridden
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.equal('normal');
            });

            // set template priority to priority
            Page.EditCurrentTemplate();
            Page.SetTemplatePriority('priority')
            Page.SaveTemplate();

            // use api to check that it was overridden
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.equal('priority');
            });
        });

        it("Should save bulk template as regular user still as bulk template", () => {
            // login as admin
            cy.login(Cypress.env("NOTIFY_ADMIN_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);

            // set template priority to bulk
            Page.SelectTemplate(templates.smoke_test_email.name);
            Page.EditCurrentTemplate();
            Page.SetTemplatePriority('bulk')
            Page.SaveTemplate();

            // use api to check that it was set
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.equal('bulk');
            });

            // login as regular user
            cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);

            // set template priority to use TC
            Page.SelectTemplate(templates.smoke_test_email_attach.name);
            Page.EditCurrentTemplate();
            Page.Components.TemplateSubject().type("a");
            Page.SaveTemplate();

            // use api to check that it was set
            Admin.GetTemplate({ templateId: templates.smoke_test_email_attach.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.equal('bulk');
            });

        });
    });
        it.only("Should save bulk template as regular user still as bulk template", () => {
            // login as regular user
            cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);

             // set template priority to use TC
             Page.SelectTemplate(templates.smoke_test_email_attach.name);
             Page.EditCurrentTemplate();
             Page.Components.TemplateSubject().type("a");
             Page.SaveTemplate();

             // use api to check that it was set
             Admin.GetTemplate({ templateId: templates.smoke_test_email_attach.id, serviceId: config.Services.Cypress }).then((response) => {
                 console.log('response', response);
                 expect(response.body.data.process_type_column).to.equal('bulk');
             });

        });
    });

});