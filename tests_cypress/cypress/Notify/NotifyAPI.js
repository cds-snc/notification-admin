import { customAlphabet } from "nanoid";

import { getConfig, getServiceID, getCurrentUserId } from "../support/utils";

const CONFIG = getConfig();
const CYPRESS_SERVICE_ID  = getServiceID('CYPRESS');
const BASE_URL = CONFIG.Hostnames.API;

const Utilities = {
    CreateJWT: (username, secret) => {
        const jwt = require('jsrsasign');
        const claims = {
            'iss': username,
            'iat': Math.round(Date.now() / 1000)
        }

        const headers = { alg: "HS256", typ: "JWT" };
        return jwt.jws.JWS.sign("HS256", JSON.stringify(headers), JSON.stringify(claims), secret);
    },
    GenerateID: (length = 10) => {
        const nanoid = customAlphabet('1234567890abcdef', length)
        return nanoid()
    },
    CreateAdminJWT: () => {
        return Utilities.CreateJWT(CONFIG.ADMIN_USERNAME, CONFIG.ADMIN_SECRET);
    },
    CreateCacheClearJWT: () => {
        return Utilities.CreateJWT(CONFIG.CACHE_CLEAR_USER_NAME, CONFIG.CACHE_CLEAR_CLIENT_SECRET);
    },
    CreateCypressJWT: () => {
        return Utilities.CreateJWT(CONFIG.CYPRESS_AUTH_USER_NAME, CONFIG.CYPRESS_AUTH_CLIENT_SECRET);
    }
};
const Admin = {
    SendOneOff: ({ to, template_id }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `/service/${CYPRESS_SERVICE_ID}/send-notification`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: {
                'to': to,
                'template_id': template_id,
                'created_by': CONFIG.NOTIFY_USER_ID,
            }
        });
    },
    ArchiveUser: ({ userId }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            failOnStatusCode: false,
            url: `${BASE_URL}/user/${userId}/archive`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
        })
    },
    GetUserByEmail: ({ email }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            failOnStatusCode: true,
            retryOnstatusCodeFailure: true,
            url: `${BASE_URL}/user/email?email=${encodeURIComponent(email)}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            }
        })
    },
    LinkOrganisationToService: ({ orgId, serviceId }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/organisations/${orgId}/service`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                "service_id": serviceId
            }
        })
    },
    CreateTemplate: ({ name, type, content, service_id, subject = null, process_type, parent_folder_id = null, template_category_id = null, created_by = null }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/service/${service_id}/template`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                "name": name,
                "template_type": type,
                "subject": subject,
                "content": content,
                "service": service_id,
                "process_type": process_type,
                "template_category_id": template_category_id,
                "created_by": created_by
            }
        });
    },
    DeleteTemplate: ({ serviceId, templateId }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/service/${serviceId}/template/${templateId}`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                "archived": true
            }
        });
    },
    GetTemplate: ({ templateId, serviceId }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/service/${serviceId}/template/${templateId}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            }
        });
    },
    UpdateTemplate: ({ id, name, type, content, service_id, subject = null, process_type, parent_folder_id = null, template_category_id = null }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/service/${service_id}/template/${id}`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                "id": id,
                "name": name,
                "template_type": type,
                "content": content,
                "service": service_id,
                "process_type": process_type,
                "template_category_id": template_category_id
            }
        });
    },
    GetTemplateCategory: ({ templateCategoryId }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/template-category/${templateCategoryId}`,
            method: 'GET',
            failOnStatusCode: false,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            }
        });
    },
    CreateTemplateCategory: ({ id = null, name_en, name_fr, desc_en, desc_fr, hidden, email_priority, sms_priority, sms_sending_vehicle }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/template-category`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                "id": id,
                "name_en": name_en,
                "name_fr": name_fr,
                "description_en": desc_en,
                "description_fr": desc_fr,
                "hidden": hidden,
                "email_process_type": email_priority,
                "sms_process_type": sms_priority,
                "sms_sending_vehicle": sms_sending_vehicle,
                "created_by_id": getCurrentUserId()
            }
        });
    },
    UpdateTemplateCategory: ({ id, name_en, name_fr, desc_en, desc_fr, hidden, email_priority, sms_priority, sms_sending_vehicle }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/template-category/${templateCategoryId}`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                "id": id,
                "name_en": name_en,
                "name_fr": name_fr,
                "description_en": desc_en,
                "description_fr": desc_fr,
                "hidden": hidden,
                "email_process_type": email_priority,
                "sms_process_type": sms_priority,
                "sms_sending_vehicle": sms_sending_vehicle,
                "updated_by_id": getCurrentUserId()
            }
        });
    },
    DeleteTemplateCategory: ({ id, cascade = false }) => {
        var token = Utilities.CreateAdminJWT();
        return cy.request({
            url: `${BASE_URL}/template-category/${id}?cascade=${cascade}`,
            method: 'DELETE',
            failOnStatusCode: false,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            }
        })
    }
}
// const Admin = {
//     CreateService: () => {
//         var token = Utilities.CreateJWT();
//         cy.request({
//             url: '/service',
//             method: 'POST',
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             },
//             body: {
//                 'created_by': 'c7aa883e-3130-4031-8610-bbe22719b23e',
//                 'name': 'Testing Service',
//                 'organisation_type': 'central',
//                 'active': true,
//                 'message_limit': 50,
//                 'user_id': 'c7aa883e-3130-4031-8610-bbe22719b23e',
//                 'restricted': true,
//                 'email_from': 'testing_service23',
//                 'default_branding_is_french': false,
//                 'sms_daily_limit': 1000
//             }
//         }).as('createRequest');

//         var service_data;
//         cy.get('@createRequest').then((resp) => {
//             service_data = resp.body.data;
//             console.log('sd', resp);
//             cy.wrap(service_data).as('service_data');
//             cy.request({
//                 url: `/service/${resp.body.data.id}/billing/free-sms-fragment-limit`,
//                 method: 'POST',
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: {
//                     "financial_year_start": null,
//                     "free_sms_fragment_limit": 25_000,
//                 }
//             });
//         });


//     },
//     ArchiveService: (service_id) => {
//         var token = Utilities.CreateJWT();
//         cy.request({
//             url: `/service/${service_id}/archive`,
//             method: 'POST',
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             }
//         });
//     },
//     Settings: {
//         SetDailyLimit: (service_id, limit) => {
//             var token = Utilities.CreateJWT();
//             cy.request({
//                 url: `/service/${service_id}`,
//                 method: 'POST',
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: {
//                     sms_daily_limit: limit
//                 }
//             });

//         }
//     }
// }

const API = {
    SendEmail: ({ api_key, to, template_id, personalisation, failOnStatusCode = true, email_reply_to_id }) => {
        return cy.request({
            failOnStatusCode: failOnStatusCode,
            url: '/v2/notifications/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'ApiKey-v1 ' + api_key,
            },
            body: {
                "email_address": to,
                "template_id": template_id,
                "personalisation": personalisation,
                ...(email_reply_to_id) && { email_reply_to_id: email_reply_to_id } // only add email_reply_to_id if it's defined
            }
        });
    },
    SendBulkEmail: ({ api_key, to, bulk_name, template_id, personalisation, failOnStatusCode = true }) => {
        return cy.request({
            failOnStatusCode: failOnStatusCode,
            url: '/v2/notifications/bulk',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'ApiKey-v1 ' + api_key,
            },
            body: {
                "name": bulk_name,
                "template_id": template_id,
                "rows": [
                    ["email address"],
                    ...to
                ],
            }
        });
    },
    SendSMS: ({ api_key, to, template_id, personalisation, failOnStatusCode = true }) => {
        return cy.request({
            failOnStatusCode: failOnStatusCode,
            url: '/v2/notifications/sms',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'ApiKey-v1 ' + api_key,
            },
            body: {
                "phone_number": to,
                "template_id": template_id,
                "personalisation": personalisation,
            }
        });
    },
    SendBulkSMS: ({ api_key, to, bulk_name, template_id, personalisation, failOnStatusCode = true }) => {
        return cy.request({
            failOnStatusCode: failOnStatusCode,
            url: '/v2/notifications/bulk',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'ApiKey-v1 ' + api_key,
            },
            body: {
                "name": bulk_name,
                "template_id": template_id,
                "rows": [
                    ["phone number"],
                    ...to
                ],
            }
        });
    },
    ClearCache: ({ pattern }) => {
        var token = Utilities.CreateCacheClearJWT();
        return cy.request({
            url: `${BASE_URL}/cache-clear`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
            body: {
                pattern: pattern
            }
        });
    },
}

const Cleanup = {
    TemplateCategories: ({ cascade = false }) => {
        var token = Utilities.CreateCypressJWT();
        return cy.request({
            url: `${BASE_URL}/cypress/template-categories/cleanup/${getCurrentUserId()}?cascade=${cascade}`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": 'application/json'
            },
        })
    },
    EmailBranding: ({ userId}) => {
        return "Not yet implemented";
    }
}


export default { API, Utilities, Admin, Cleanup };
