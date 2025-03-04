/**
 * Retrieves the hostname based on the specified type and environment from Cypress environment variables.
 *
 * @param {string} [type='Admin'] - The type of hostname to retrieve (e.g., 'Admin', 'User').
 * @returns {string} The hostname corresponding to the specified type and environment.
 */
export const getHostname = (type = 'Admin') => {
    const env = Cypress.env('ENV') || 'LOCAL';
    return Cypress.env('Environment')[env].Hostnames[type];
};

/**
 * Retrieves a service ID from Cypress environment variables.
 *
 * @param {string} service - The name of the service to retrieve.
 * @returns {*} The configuration for the specified service.
 */
export const getServiceID = (service) => {
    return Cypress.env('Services')[service];
};

/**
 * Retrieves a template ID from the Cypress environment variables.
 *
 * @param {string} template - The name of the template to retrieve.
 * @returns {any} The template object from the Cypress environment variables.
 */
export const getTemplateID = (template) => {
    return Cypress.env('Templates')[template];
};