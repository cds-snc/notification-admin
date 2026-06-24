# AGENTS.md

Agent instructions for this repository.

## Scope

- This codebase is a Flask admin app with Python backend and Vite/Tailwind frontend assets.
- Prefer small, focused diffs. Avoid broad refactors unless explicitly requested.

## Project Overview

- App type: Flask server-rendered admin UI with Jinja templates plus selective React islands.
- Backend runtime: Python 3.12 via Poetry.
- Frontend toolchain: Vite 8, React 18, TailwindCSS 3.
- Primary concern: service/user/template administration flows backed by Notify API clients.

## First Stops

- Project setup and constraints: [README.md](README.md)
- Canonical task runner targets: [Makefile](Makefile)
- Python tooling and lint/type config: [pyproject.toml](pyproject.toml)
- Test defaults, markers, and env overrides: [pytest.ini](pytest.ini)
- Runtime entrypoint and tracing toggle: [application.py](application.py)
- App factory and blueprint wiring: [app/__init__.py](app/__init__.py)
- Frontend HMR context and limitations: [docs/css-hmr-plan.md](docs/css-hmr-plan.md)

## Canonical Commands

- Install deps: `poetry install` and `npm install`
- Run local dev (Flask debugpy + tailwind watch): `make run-dev`
- Run tests/lint/type checks (project standard): `make test`
- Run Python tests only: `poetry run pytest tests/app -n 4`
- Run JS tests only: `npm test`
- Build frontend assets: `npm run build`
- Watch frontend assets: `npm run watch`
- Compile translations: `make babel`

Prefer these over ad-hoc command variants when validating changes.

## Architecture Map

- WSGI entrypoint: [application.py](application.py)
- Main backend package: [app/](app)
- Server-rendered views/routes: [app/main/views/](app/main/views)
- API client wrappers: [app/notify_client/](app/notify_client)
- Domain models/helpers: [app/models/](app/models)
- Frontend source JS: [app/assets/javascripts/](app/assets/javascripts)
- Frontend source CSS: [app/assets/stylesheets/](app/assets/stylesheets)
- Python tests: [tests/app/](tests/app)
- JS tests: [tests/javascripts/](tests/javascripts)
- Cypress tests: [tests_cypress/](tests_cypress)

## Frontend Implementation Guide

### React Components

- React components in this repo live under feature folders in [app/assets/javascripts/](app/assets/javascripts).
- Keep new components within a feature directory rather than creating a cross-cutting shared folder unless existing code already uses one for that concern.
- Pattern to follow for server-rendered pages: expose a small mount API from an entry file, then call `createRoot(...).render(...)`.
- Keep browser-global exports minimal and only when needed for template bootstrapping.
- Keep component logic in focused files and colocate feature helpers/hooks with the component.

### Vite Usage

- Modern ES module bundles are defined in [vite.config.js](vite.config.js) as explicit entrypoints.
- Legacy IIFE bundle (`all.min.js`) is built separately via [vite.legacy.config.js](vite.legacy.config.js).
- When adding a new standalone frontend feature that needs its own bundle:
	- Add an input entry in [vite.config.js](vite.config.js).
	- Ensure output naming remains compatible with static asset fingerprinting (`javascripts/[name].min.js`).
	- Wire the script into the relevant template/view.
- JSX in `.js` files is supported intentionally through the pre-transform plugin in [vite.config.js](vite.config.js). Do not migrate file extensions just to satisfy Vite parsing.

### Tailwind and CSS

- Tailwind source of truth is [app/assets/stylesheets/tailwind/style.css](app/assets/stylesheets/tailwind/style.css), which imports component/view partials.
- Add new component styles as a dedicated file in [app/assets/stylesheets/tailwind/components/](app/assets/stylesheets/tailwind/components), then import it from [app/assets/stylesheets/tailwind/style.css](app/assets/stylesheets/tailwind/style.css).
- Keep utility/class names compatible with configured theme tokens in [tailwind.config.js](tailwind.config.js).
- If a class is dynamically generated at runtime and not statically discoverable, add it to the safelist in [tailwind.config.js](tailwind.config.js).

### Frontend Testing Expectations

- Jest config is in [tests/javascripts/jest.config.js](tests/javascripts/jest.config.js).
- Some frontend tests rely on Babel transforms for JSX in `.js` files; keep this in mind when moving files or introducing new JSX-heavy areas.
- For UI behavior changes, add or update:
	- Unit tests under [tests/javascripts/](tests/javascripts)
	- Cypress tests under [tests_cypress/](tests_cypress) when end-to-end behavior changes

## Flask and Jinja Structure

### Routes and Views

- Main application routes are in [app/main/views/](app/main/views) and mounted via the `main` blueprint in [app/main/__init__.py](app/main/__init__.py).
- Group new routes by domain (for example service settings, templates, dashboard) by adding to the most relevant existing view module.
- If a domain grows substantially, add a new view module under [app/main/views/](app/main/views) and register its import in [app/main/__init__.py](app/main/__init__.py).
- Use existing decorators and guards consistently (for example permission checks around service/org scoped routes).

### Jinja Templates

- Base layout and shared script/style loading are centralized in [app/templates/main_template.html](app/templates/main_template.html).
- Page templates generally live under [app/templates/views/](app/templates/views) and shared fragments under [app/templates/partials/](app/templates/partials).
- For new pages, prefer extending `main_template.html` and composing partials/macros rather than duplicating structure.
- Keep route handlers and template paths aligned: a new view should render a template in the corresponding area of [app/templates/views/](app/templates/views).

### Jinja Macros and Component Reuse

- Prefer existing macros/components before creating new template patterns.
- Check reusable building blocks in [app/templates/components/](app/templates/components) and shared partials in [app/templates/partials/](app/templates/partials).
- If a pattern is used in more than one page, extract it into a macro/partial rather than duplicating markup.
- Keep macro APIs stable and explicit (clear parameter names, minimal side effects) to reduce template regressions.

### Models and API-Backed Data

- Models in [app/models/](app/models) are mostly thin wrappers over API client responses (not ORM entities).
- Prefer extending existing model methods and API clients in [app/notify_client/](app/notify_client) rather than embedding API calls directly in templates.
- Keep transformation logic close to view/model boundaries so Jinja templates remain presentation-focused.

### Decorators and Access Control

- Reuse existing auth/permission decorators from [app/utils.py](app/utils.py) for route protection:
	- `user_has_permissions(...)`
	- `user_is_gov_user`
	- `user_is_platform_admin`
- Do not duplicate authorization logic inside view bodies when a decorator can enforce it consistently.
- For service- or org-scoped routes, follow existing permission patterns in neighboring view functions in [app/main/views/](app/main/views).

### Page Change Checklist

- When adding or changing a page flow, update together where applicable:
	- Route/view logic in [app/main/views/](app/main/views)
	- Jinja template(s) in [app/templates/views/](app/templates/views)
	- Shared partials/macros in [app/templates/partials/](app/templates/partials)
	- Frontend entry/component code in [app/assets/javascripts/](app/assets/javascripts) if the page behavior depends on JS
	- Tests under [tests/app/](tests/app) and [tests/javascripts/](tests/javascripts)

## Conventions To Respect

- Python style is enforced by Ruff and MyPy; use configured defaults in [pyproject.toml](pyproject.toml).
- JS/CSS formatting uses Prettier on frontend directories; keep output consistent with existing style.
- Keep route/view changes close to corresponding tests under [tests/app/main/views/](tests/app/main/views) when applicable.
- For frontend behavior, update unit tests in [tests/javascripts/](tests/javascripts) when logic changes.

## Security Considerations

- Never commit secrets, API keys, tokens, or `.env` values.
- Treat notification content, recipient data, and uploaded files as sensitive; avoid copying real data into fixtures or snapshots.
- Keep authentication/authorization checks at route boundaries (decorators + current-user checks), not only in templates or client code.
- For file upload or attachment features, validate type/size rules server-side and keep client checks as defense-in-depth.

## Git Workflow

- Keep commits narrowly scoped to one logical change.
- Do not bundle unrelated formatting-only changes with behavior changes.
- Before proposing merge-ready changes, run the smallest relevant command set from the Canonical Commands section and report what was executed.
- If a change impacts both backend and frontend, validate both paths (for example `make test` and `npm run build`).

## Boundaries

### Always

- Prefer existing patterns in neighboring files before introducing new abstractions.
- Add or update tests for behavior changes.
- Link to existing docs/config files instead of duplicating long instructions.

### Ask First

- Adding new dependencies (Python or Node).
- Modifying CI/CD, deployment, or runtime infra configs.
- Large structural refactors across multiple domains.

### Never

- Never hardcode secrets or credentials in code, tests, or docs.
- Never edit generated/vendor/dependency artifacts by hand.
- Never remove or weaken auth checks to satisfy tests.

## Common Pitfalls

- Dev debugger attach flow expects debugpy on port `5678`; use `make run-dev` to match workspace tasks.
- Test environment overrides key vars via [pytest.ini](pytest.ini); do not assume `.env` values during tests.
- Redis-backed paths require `REDIS_ENABLED`; local defaults can mask behavior differences.
- CSS/asset behavior differs between local dev and built static output; validate with the command that matches the target environment.

## Change Validation Guidance

- Backend change: run `make test` (or targeted pytest while iterating, then `make test`).
- Frontend change: run `npm run build` and relevant Jest/Cypress tests.
- Translation change: run `make babel` and `make test-translations`.

If a full suite cannot be run, document what was run and why.

## Maintenance Rule For This File

- Keep this file concise and high-signal. Target roughly 120-200 lines.
- Prefer linking to source docs/config files instead of copying detailed procedures.
- If a section grows large, move detail into a scoped instruction/skill and link it here.

## Clarifications and asking questions
- Use the #askUser tool for all questions and clarifications
- Use the #askUser tool before finalizing any request
