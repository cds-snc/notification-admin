var config = require('./config');

const { defineConfig } = require("cypress");
const EmailAccount = require("./cypress/plugins/email-account")
const htmlvalidate = require("cypress-html-validate/plugin");
const env = require('./cypress.env.json');
// const webpackPreprocessor = require('@cypress/webpack-preprocessor')
// const webpack = require('webpack')


module.exports = defineConfig({
  e2e: {
    baseUrl: config.Hostnames.Admin,
    setupNodeEvents: async (on, config) => {
      htmlvalidate.install(on, {
        rules: {
          "form-dup-name": "off",
        },
      });

      let emailAccount = await EmailAccount(env.NOTIFY_USER, env.NOTIFY_PASSWORD)

      on('task', {
        log(message) { // for debugging
          console.log(message)
          return null
        },
        getLastEmail() {
          return emailAccount.getLastEmail()
        },
        deleteAllEmails() {
          return emailAccount.deleteAllEmails()
        },
        fetchEmail() {
          return emailAccount.fetchEmail(username, password)
        },
        async createEmailAccount({ username, password }) {
          emailAccount = await EmailAccount(username, password);
          return emailAccount;
        }
      });

      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.extensions = [];
        }
        return launchOptions;
      });
    },
    specPattern: '**/e2e/**/*.cy.js',
    watchForFileChanges: false,
    blockHosts: ['*google-analytics.com', 'stats.g.doubleclick.net', 'bam.nr-data.net', '*newrelic.com'],
    viewportWidth: 1280,
    viewportHeight: 850,
    testIsolation: false,
    retries: 3
  },
});
