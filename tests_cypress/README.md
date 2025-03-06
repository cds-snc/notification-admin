# Notify + Cypress 🎉

## Setup
This folder contains Cypress tests suites.  In order to run them, you'll need to install cypress and its dependencies. If you're running inside the dev container, rebuild your dev container to get the necessary packages.  

## Running the tests
### In your devcontainer
There are some issues getting the cypress UI to launch within the devcontainer.  For now, you can run the headless tests inside the dev container but if you want to launch the cypress UI you will need to do that outside of the dev container.  

There are 3 helper scripts in `package.json` to run 2 of the test suites.  Run these from the `tests_cypress/` folder:
- `npm run cypress`:  this will open Cypress with its UI and you can choose any test suite to run
- `npm run a11y`: this will run the accessibility tests in headless mode using the electron browser
- `npm run ci`: this will run the headless CI tests in headless mode using the electron browser

### Outside of your devcontainer
To launch the cypress UI, where you can choose your test suite and visually debug and inspect tests, run (from the `tests_cypress/` folder):
- `npm run cypress`: this will open the cypress UI where you can choose which tests to run and in which browser

### Local installation
To install cypress locally, use the following command, from the `tests_cypress/` folder:
```bash
npm install
npx cypress install
```

## Configuration 
- `cypress.env.json`: this file contains mostly sensitive items like api keys and passphrases that you'll need to run the tests. You'll need to add the file `cypress.env.json` into the `tests_cypress/` folder and its contents can be found in 1password.
- `cypress.config.js`: this file contains an env object that contains static IDs and hostnames that will be used by the tests
- `support/utils.js`: this file contains utility functions that are used by the tests to get service IDs, template IDs, and hostnames

### `cypress.env.json` contents

#### Top-level values, same between environments

| key                           | description                                     |
| ----------------------------- | ----------------------------------------------- |
| ENV                           | The environment to run the tests against        |
| ADMIN_USERNAME                | Username admin uses to authenticate against API |
| CYPRESS_AUTH_USER_NAME        | Username for the Cypress auth client            | 
| CACHE_CLEAR_USER_NAME         | Username for the cache clearing auth client     |
| NOTIFY_UI_TEST_EMAIL_ADDRESS  | Notify email account used by the tests          |
| NOTIFY_PASSWORD               | Password of NOTIFY_USER (gmail)                 |
| IMAP_PASSWORD                 | IMAP password of gmail account for NOTIFY_USER  |

### Environment-specific values

| key                           | description                                     |
| ----------------------------- | ----------------------------------------------- |
| ADMIN_SECRET                  | Secret admin uses to authenticate against API   |
| CYPRESS_AUTH_CLIENT_SECRET    | Secret for the Cypress auth client              |
| CYPRESS_USER_PASSWORD         | Password for the cypress notify user            |
| CACHE_CLEAR_CLIENT_SECRET     | Secret for the cache clearing auth client       |
| WAF_SECRET                    | Secret to bypass WAF rate limits                |

### Setting target environment 🎯

To control which environment cypress targets, change the value of `ENV` at the top of your `cypress.env.json` class.  Valid values are `LOCAL` and `STAGING`.