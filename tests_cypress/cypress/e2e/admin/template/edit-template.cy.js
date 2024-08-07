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
    const categories = {
        OTHER: "Other",
        AUTH: "Authentication",
        AUTOREPLY: "Automatic reply",
      };
describe("Edit template", () => {
    context.skip("FF OFF", () => {
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
            const template_name = 'Test Template';

            // seed data
            cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);
            Page.CreateTemplate();
            Page.SelectTemplateType("email");
            Page.Continue();
            Page.FillTemplateForm(
                template_name,
                "Test Subject",
                "Test Content",
                false,
                false
            );
            Page.SaveTemplate();

            cy.url().then((url) => {
                let templateId = url.split("/templates/")[1];

                // update category
                cy.visit(`/services/${config.Services.Cypress}/templates`);
                Page.SelectTemplate(template_name);
                Page.EditCurrentTemplate();
                Page.Components.TemplateSubject().type('a');
                Page.SaveTemplate();

                Admin.GetTemplate({ templateId: templateId, serviceId: config.Services.Cypress }).then((response) => {
                    let template = response.body.data;
                    expect(template.process_type_column).to.equal('bulk');
                    Admin.DeleteTemplate({ templateId: templateId, serviceId: config.Services.Cypress })
                })
            })

        });
    });
    context("FF ON", () => {
        // Override the process_type -> new process type should be saved for an existing template
        it("Should allow platform admin to override process type", () => { // Admin user 1.
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

        it("Should allow platform admin to set priority to 'use template category'", () => { // Admin user 3.
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

            // set template priority to use template category
            Page.EditCurrentTemplate();
            Page.SetTemplatePriority('__use_tc')
            Page.SaveTemplate();

            // use api to check that it was overridden
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.be.null;
            });

        });

        it("Should save bulk template as regular user still as bulk template", () => { // Non-admin 1.
            const template_name = 'Test Template';

            // seed data
            cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);
            Page.CreateTemplate();
            Page.SelectTemplateType("email");
            Page.Continue();
            Page.FillTemplateForm(
                template_name,
                "Test Subject",
                "Test Content",
                categories.AUTH
            );
            Page.SaveTemplate();

            cy.url().then((url) => {
                let templateId = url.split("/templates/")[1];

                // update category
                cy.visit(`/services/${config.Services.Cypress}/templates`);
                Page.SelectTemplate(template_name);
                Page.EditCurrentTemplate();
                Page.ExpandTemplateCategories();
                Page.SelectTemplateCategory(categories.AUTOREPLY);
                Page.SaveTemplate();

                Admin.GetTemplate({ templateId: templateId, serviceId: config.Services.Cypress }).then((response) => {
                    let template = response.body.data;
                    expect(template.process_type_column).to.be.null;
                    Admin.DeleteTemplate({ templateId: templateId, serviceId: config.Services.Cypress })
                })
            })

        });

        it("Should allow platform admin to set priority to 'use template category'", () => { // Non-admin 3.
            // login as admin
            cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
            cy.visit(`/services/${config.Services.Cypress}/templates`);

            // set template category to known state
            Page.SelectTemplate(templates.smoke_test_email.name);
            Page.EditCurrentTemplate();
            Page.ExpandTemplateCategories();
            Page.SelectTemplateCategory(categories.AUTOREPLY);
            Page.SaveTemplate();

            // use api to check that it was set
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.be.null;
            });

            // update category
            Page.EditCurrentTemplate();
            Page.ExpandTemplateCategories();
            Page.SelectTemplateCategory(categories.AUTH);
            Page.SaveTemplate();

            // use api to check that it was set
            Admin.GetTemplate({ templateId: templates.smoke_test_email.id, serviceId: config.Services.Cypress }).then((response) => {
                console.log('response', response);
                expect(response.body.data.process_type_column).to.be.null;
            });
        });
    });
});