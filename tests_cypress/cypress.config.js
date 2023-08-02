var config = require('./config');

const { defineConfig } = require("cypress");
const EmailAccount = require("./cypress/plugins/email-account")
const htmlvalidate = require("cypress-html-validate/plugin");

module.exports = defineConfig({
  e2e: {
    baseUrl: config.Hostnames.Admin,
    setupNodeEvents: async (on, config) => {
      htmlvalidate.install(on, {
        rules: {
          "form-dup-name": "off",
        },
      });

      const emailAccount = await EmailAccount()
      on('task', {
        log (message) { // for debugging
          console.log(message)
          return null
        },
        getLastEmail() {
          return emailAccount.getLastEmail()
        },
        deleteAllEmails() {
          return emailAccount.deleteAllEmails()
        },
        fetchEmail(acct) {
          return emailAccount.fetchEmail(acct)
        },
        createEmailAccount() {
          return emailAccount.createEmailAccount();
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
    testIsolation: false
  },
});
