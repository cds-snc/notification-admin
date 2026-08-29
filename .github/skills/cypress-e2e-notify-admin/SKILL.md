---
name: cypress-e2e-notify-admin
description: 'Writes Cypress end-to-end tests for notification-admin using the page-object pattern, with `data-testid` selectors and mandatory `a11yScan` coverage. Use this skill whenever the user asks to "add an e2e test", "write a cypress spec", "add a page object", "add a test id", "check accessibility in cypress", or is editing files under `tests_cypress/`, even if they don''t explicitly say "cypress".'
argument-hint: 'Describe the flow to cover, the page(s) involved, and whether new page objects or test ids are needed.'
---

# Cypress E2E for Notification Admin

## When to Use
- Add an e2e spec for a user flow
- Extend a page object with new selectors/actions
- Add accessibility coverage to a page
- Update selectors after a UI change

## When NOT to Use
- Python/Jest unit tests — use tests/app/ or tests/javascripts/ directly
- Pure backend route logic with no user-facing flow

## Important
- **Selector rule:** every selector goes through `cy.getByTestId('...')`. If the element has no `data-testid`, add one to the template/component as part of your change. No `#id`, class, tag, or Tailwind utility selectors.
- **A11y rule:** every spec calls `cy.a11yScan(url)` on every page state covered. A spec without `a11yScan` is incomplete.

## Core Locations
- Specs: tests_cypress/cypress/e2e/admin/
- Page objects (POM): tests_cypress/cypress/Notify/Admin/Pages/
- Shared barrel for page objects: tests_cypress/cypress/Notify/Admin/Pages/all.js
- Support/commands: tests_cypress/cypress/support/
- Config: tests_cypress/cypress.config.js
- Repo guide: tests_cypress/README.md

## Conventions
- Use the Page Object Model. Existing page modules define:
  - `Components` — selector functions returning Cypress chains
  - `Actions` — higher-level user interactions composed from `Components`
  Then default-export a page object shaped like `{ Components, ...Actions }` so specs can call actions at the page-object top level.
- **Always select by `data-testid`** using `cy.getByTestId('...')`. This decouples tests from UI structure so the markup can be refactored without breaking tests.
  - If a needed element has no `data-testid`, add one to the Jinja template or React component as part of your change. Keep ids kebab-case and scoped to the feature.
  - Do not use `#id`, class, tag, or Tailwind utility selectors. Limited use of `cy.contains('h1', '...')` is acceptable only for asserting visible page headings.
- Import the default barrel object, then read pages from it: `import Pages from "../../Notify/Admin/Pages/all";`
- Use `before` to log in once per suite and `beforeEach` to stub recurring polling (e.g. `cy.intercept('GET', '**/dashboard.json', {})`).
- **Always add accessibility coverage.** Every spec must call `cy.a11yScan(url)` (defined in [tests_cypress/cypress/support/commands.js](../../../tests_cypress/cypress/support/commands.js)) for each page state under test. This runs axe, html validation, dead-link, and mime-type checks in one call.

## Authentication and Test Users
- A regular service user and a platform-admin user are created automatically on first login via the `createAccount` task (see [tests_cypress/cypress/support/commands.js](../../../tests_cypress/cypress/support/commands.js)). Do not hand-roll users or fixtures for auth.
- Use `cy.login()` for a standard service user, and `cy.loginAsPlatformAdmin()` for platform-admin flows. Pass `false` to skip the terms-of-use prompt (e.g. `cy.login(false)`).
- Both helpers wrap `cy.session(...)`, so calling them in `before` (or in `beforeEach` when sessions differ between tests) is cheap — the session is cached for the spec.
- After login, ids are available via `Cypress.env('REGULAR_USER_ID')` and `Cypress.env('ADMIN_USER_ID')` if a test needs them.
- Never type credentials directly in a spec; always go through `cy.login` / `cy.loginAsPlatformAdmin`.

## Procedure
1. Identify or create the page object under tests_cypress/cypress/Notify/Admin/Pages/ and export it from `all.js`.
2. Add selectors to `Components` using `cy.getByTestId` where possible; add `data-testid` to the underlying template/component if missing.
3. Compose user-facing steps in `Actions` (login, fill form, submit, navigate).
4. Write the spec under tests_cypress/cypress/e2e/admin/ following the existing `describe`/`before`/`beforeEach`/`after` pattern.
5. Call `cy.a11yScan(url)` on every page state covered by the spec — this is mandatory, not optional.
6. Run the spec locally before finalizing.

## Validation Commands
- Run a single spec: `npx cypress run --spec tests_cypress/cypress/e2e/admin/<file>.cy.js`
- Open interactive runner: `npx cypress open`
- See [tests_cypress/README.md](../../../tests_cypress/README.md) for env vars and auth setup.

## Guardrails
- Don't couple tests to Tailwind utility classes or generated DOM structure.
- Don't add long `cy.wait(ms)` calls; prefer assertions or `cy.intercept` waits.
- Don't commit real credentials or recipient data; use env vars and fixtures.
- Don't delete or weaken a failing test to make CI green — fix the underlying issue or flag it.
