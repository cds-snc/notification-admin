const fs = require('fs');
const { defineConfig } = require("cypress");
const EmailAccount = require("./cypress/plugins/email-account");
const CreateAccount = require("./cypress/plugins/create-account");
const htmlvalidate = require("cypress-html-validate/plugin");

// determine whether Cypress is running in a Docker container
const isDocker = fs.existsSync('/.dockerenv');

module.exports = defineConfig({
  e2e: {
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/results',
      overwrite: false,
      html: false,
      json: true,
    },

    // static values for all environments
    env: {
      ADMIN_USERNAME: "notify-admin",
      CYPRESS_AUTH_USER_NAME: "CYPRESS_AUTH_USER",
      CACHE_CLEAR_USER_NAME: "CACHE_CLEAR_USER",
      Services: {
        GC_NOTIFY: 'd6aa2c68-a2d9-4437-ab19-3ae8eb202553',
        CYPRESS: 'd4e8a7f4-2b8a-4c9a-8b3f-9c2d4e8a7f4b',
      },
      Templates: {
        'SMOKE_TEST_EMAIL': 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'SMOKE_TEST_SMS': 'e4b8f8d0-6a3b-4b9e-8c2b-1f2d3e4a5b6c',
      },
      Environment: {
        STAGING: {
          Hostnames: {
            API: 'https://api.staging.notification.cdssandbox.xyz',
            Admin: 'https://staging.notification.cdssandbox.xyz',
            DDAPI: 'https://api.document.staging.notification.cdssandbox.xyz',
          },
        },
        LOCAL: {
          Hostnames: {
            // use host.docker.internal to access localhost from a Docker container
            API: isDocker ? 'http://host.docker.internal:6011' : 'http://localhost:6011',
            Admin: isDocker ? 'http://host.docker.internal:6012' : 'http://localhost:6012',
            DDAPI: isDocker ? 'http://host.docker.internal:7000' : 'http://localhost:7000',
          },
        }
      }
    },
    setupNodeEvents: async (on, config) => {
      // Set baseUrl dynamically based on ENV
      const envName = config.env.ENV || 'STAGING';
      // add error handling if config.env.ENV value doesnt exist in config.env.Environment
      if (!config.env.Environment[envName]) {
        throw new Error(`Environment configuration for '${envName}' does not exist.  Check the 'ENV' value in the cypress.env.json and ensure a configuration exists for that environment.`);
      }

      // Set the baseUrl to the correct environment if no override is specified (this is how CI overrides the baseUrl for each PR review env)
      if (!config.baseUrl)
        config.baseUrl = config.env.Environment[envName].Hostnames.Admin;

      htmlvalidate.install(on, {
        rules: {
          "form-dup-name": "off",
          "prefer-native-element": ["error", {
            "exclude": ["button", "link", "listbox", "textbox"]
          }],
          "no-redundant-role": "off",
          "no-dup-class": "off",
          "require-sri": "off",
        },
      });

      const emailAccount = await EmailAccount()

      on('task', {
        log(message) { // for debugging
          console.log(message)
          return null
        },
        // Email Account ///
        getLastEmail(emailAddress) {
          return emailAccount.getLastEmail(emailAddress)
        },
        deleteAllEmails() {
          return emailAccount.deleteAllEmails()
        },
        fetchEmail(acct) {
          return emailAccount.fetchEmail(acct)
        },
        clearAccount() {
          global.acct = null;
          return null;
        },
        createAccount({ baseUrl, username, secret }) {
          if (global.acct) {
            return global.acct;
          } else {
            let acct = CreateAccount(baseUrl, username, secret);
            global.acct = acct;
            return acct
          }
        },
        getUserName() {
          return global.acct;
        }
      });

      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.extensions = [];

          // Disable WebAuthn/FIDO2 features to prevent real hardware access
          launchOptions.args.push('--disable-features=WebAuthentication');
          launchOptions.args.push('--disable-features=WebAuthenticationBluetooth');
          launchOptions.args.push('--disable-features=WebAuthenticationCable');
          launchOptions.args.push('--disable-backgrounding-occluded-windows');
          launchOptions.args.push('--disable-background-timer-throttling');
          launchOptions.args.push('--disable-renderer-backgrounding');
        }
        return launchOptions;
      });

      return config;
    },
    specPattern: '**/e2e/**/*.cy.js',
    watchForFileChanges: false,
    blockHosts: ['*google-analytics.com', 'stats.g.doubleclick.net', 'bam.nr-data.net', '*newrelic.com', '*qualtrics.com', 'fonts.gstatic.com'],
    viewportWidth: 1280,
    viewportHeight: 850,
    testIsolation: true,
    pageLoadTimeout: 120000, // 2 minutes for slow CI environments
    // retries: 2
  },
});
