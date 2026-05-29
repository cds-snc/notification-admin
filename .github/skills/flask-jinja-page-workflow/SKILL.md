---
name: flask-jinja-page-workflow
description: 'Adds or updates server-rendered Flask + Jinja pages in notification-admin — routes, views, forms, templates, partials, and matching tests. Use this skill whenever the user asks to "add a route", "new page", "new view", "wire up a form", "update this Jinja template", "add a partial", or is touching files under app/main/views/ or app/templates/, even if they don\'t explicitly mention Flask or Jinja.'
argument-hint: 'Describe the page or flow to add/change, route path, and permission requirements.'
---

# Flask Jinja Page Workflow

## When to Use
- Add a new page or route in the Flask app
- Modify an existing page flow in server-rendered UI
- Wire a form submission path (GET + POST)
- Update page-level navigation, partials, or macros

## When NOT to Use
- Pure API client / `notify_client` work with no template change
- Frontend-only React/Vite changes — use the React/Vite guidance in AGENTS.md instead
- Cypress test work — use the cypress-e2e-notify-admin skill

## Core Files
- Routes/views: app/main/views/
- Blueprint import registration: app/main/__init__.py
- Templates: app/templates/views/
- Shared partials and macros: app/templates/partials/ and app/templates/components/
- Common auth/permission decorators: app/utils.py
- Page tests: tests/app/

## Procedure
1. Find the domain view module in app/main/views/ that matches the feature area.
2. Add or update route functions and keep decorator usage consistent:
- user_has_permissions(...)
- user_is_gov_user
- user_is_platform_admin
3. Keep business/data logic in view/model/client layers, not in Jinja templates.
4. Render or update a template under app/templates/views/ and compose shared partials/macros.
5. If shared markup appears in multiple pages, extract to app/templates/partials/ or app/templates/components/.
6. Add or update tests in tests/app/ near the affected feature.
7. Run relevant validation commands.

## Validation Commands
- make test
- poetry run pytest tests/app -n 4

## Guardrails
- Keep diffs scoped to one page flow unless asked otherwise.
- Do not duplicate permission logic when decorators can enforce it.
- Prefer existing template blocks/macros over one-off markup duplication.
