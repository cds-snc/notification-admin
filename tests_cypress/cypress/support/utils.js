const ENVIRONMENTS = ['LOCAL', 'STAGING'];

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

/**
 * Retrieves the merged configuration for the current environment.
 *
 * The configuration is built by merging the following sources in order:
 * 1. Environment-specific values from the "Environment" property in Cypress environment variables.
 * 2. Environment-specific values from the cypress.env.json file.
 * 3. Remaining top-level values from Cypress environment variables, excluding "Environment" and current environment node.
 *
 * @returns {Object} The merged configuration object.
 */
export const getConfig = () => {
    const envName = Cypress.env("ENV") || 'LOCAL';

    // Create the merged configuration
    const config = {
        // 1. Add environment-specific values from Environment property
        ...Cypress.env("Environment")[envName],

        // 2. Add environment-specific values from cypress.env.json
        ...Cypress.env(envName),

        // 3. Add remaining top-level values except Environment and current env node
        ...Object.entries(Cypress.env())
            .filter(([key]) => key !== 'Environment' && !ENVIRONMENTS.includes(key))
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {}),
        // 4. Always include ENV property for downstream code
        ENV: envName
    };

    return config;
};

/**
 * Converts key_like_strings into "Human Readable" strings.
 * Example: `SOME_KEY_NAME` -> `Some Key Name`
 */
export const humanize = (key) =>
    String(key)
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
