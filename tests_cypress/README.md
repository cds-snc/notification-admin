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
- `npm run perf:staging`: this will run the dedicated performance smoke suite in headless Chrome against staging

### Outside of your devcontainer
To launch the cypress UI, where you can choose your test suite and visually debug and inspect tests, run (from the `tests_cypress/` folder):
- `npm run cypress`: this will open the cypress UI where you can choose which tests to run and in which browser

## Performance smoke runs
Use the performance suite when you want repeatable synthetic timings for a staging or PR environment without mixing those measurements into the main CI smoke tests.

The current PoC is intentionally modest: it validates the full front-to-back path by logging in and measuring a few authenticated read-only pages such as dashboard, settings, and templates. Additional write-path journeys can be added after this baseline is stable.

There is also a manual GitHub Actions workflow at `.github/workflows/cypress-performance.yml`. Trigger it from the Actions tab on your PR branch. If you leave `base_url` empty it targets staging; if you paste a PR review URL it will run against that deployment instead.

Optional environment variables:
- `PERF_REPEAT`: number of iterations to execute. Defaults to `5`.
- `PERF_RUN_ID`: optional identifier to reuse across all artifacts from one run.
- `PERF_ARTIFACT_DIR`: output folder for JSON artifacts. Defaults to `cypress/results/perf`.

The generated JSON artifacts include:
- total journey duration
- per-page visit timings
- captured request durations
- browser and environment metadata

Treat the first run as a warm-up and use the remaining runs for comparison. These checks are intended for comparative measurements, not for concurrency or capacity claims.

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

| key                           | description                                            |
| ----------------------------- | ------------------------------------------------------ |
| ENV                           | The environment to run the tests against               |
| NOTIFY_UI_TEST_EMAIL_ADDRESS  | Notify email account used by the tests to check email  |
| IMAP_PASSWORD                 | IMAP password of gmail account for NOTIFY_USER         |

### Environment-specific values
Get those from admin and api .env files

TODO: CYPRESS_USER_PASSWORD is called CYPRESS_USER_PW_SECRET in the .env files

| key                           | description                                            |
| ----------------------------- | ------------------------------------------------------ |
| ADMIN_SECRET                  | Secret admin uses to authenticate against API          |
| CYPRESS_AUTH_CLIENT_SECRET    | Secret for the Cypress auth client                     |
| CYPRESS_USER_PASSWORD         | Password for the cypress notify users                  |
| CACHE_CLEAR_CLIENT_SECRET     | Secret for the cache clearing auth client              |
| WAF_SECRET                    | Secret to bypass WAF rate limits                       |

### Test user creation
- When cypress starts, it makes a call to API to create new test users (one regular, and one platform admin).  
- It does this via the `/cypress` route on API, and uses the `CYPRESS_AUTH_CLIENT_SECRET` to create a JWT.  
- When it creates the user, it uses the password stored in `CYPRESS_USER_PASSWORD`.
  
**IMPORTANT:**
- **Your API `.env` must have the same value for `CYPRESS_AUTH_CLIENT_SECRET` as `cypress.env.json` in order for cypress to be able to authenticate with API.**
- **Your API `.env` must have the same value for `CYPRESS_USER_PASSWORD` as `cypress.env.json` in order for API to use the correct password when creating the user accounts.**

### Setting target environment 🎯

To control which environment cypress targets, change the value of `ENV` at the top of your `cypress.env.json` class.  Valid values are `LOCAL` and `STAGING`.