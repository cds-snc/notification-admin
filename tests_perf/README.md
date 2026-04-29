# Admin performance tests (Phase 1)

This folder contains the initial Locust-based performance test scaffold for Admin.

Phase 1 scope:

- Bootstrap test accounts via the same API flow used in Cypress create-account.js (`/cypress/cleanup` then `/cypress/create_user/<suffix>`)
- Authenticate against Admin
- Load the service dashboard route

## Folder layout

- `bootstrap_accounts.py` - creates test accounts and writes an accounts JSON file
- `config.py` - environment variable parsing
- `auth.py` - authenticated Admin session login helpers
- `locustfile.py` - phase-1 dashboard scenario

## Environment variables

The scripts use a single local env file for perf settings:

- `tests_perf/.env`

Precedence:

1. Shell/exported variables (highest)
2. `tests_perf/.env`

When running inside a devcontainer, `http://localhost:<port>` values for `PERF_API_BASE_URL` and
`PERF_ADMIN_BASE_URL` are automatically remapped to `http://host.docker.internal:<port>`.

Required:

- `PERF_API_BASE_URL` (for account bootstrap, for example `https://api.staging.notification.cdssandbox.xyz`)
- `PERF_ADMIN_BASE_URL` (for Locust host, for example `https://staging.notification.cdssandbox.xyz`)
- `PERF_CYPRESS_AUTH_USER_NAME`
- `PERF_CYPRESS_AUTH_CLIENT_SECRET`
- `PERF_USER_PASSWORD` (same password configured for Cypress-created users)
- `PERF_TARGET_SERVICE_ID` (existing service to hit for dashboard route)

Optional:

- `PERF_USER_COUNT` (default `10`)
- `PERF_2FA_CODE` (default `12345`, suitable for local dev)
- `PERF_REQUIRE_CSRF` (default `true`; set to `false` only for local troubleshooting)
- `PERF_LOG_ASSET_DISCOVERY` (default `false`; prints discovered asset count and sample paths)
- `PERF_ACCOUNTS_FILE` (default `/tmp/tests_perf_accounts.json`)
- `PERF_ADD_TO_SERVICE_URL_TEMPLATE` (optional endpoint template for adding user to an existing service)
  - Placeholders supported: `{base_url}`, `{service_id}`, `{user_id}`
- `PERF_ADD_TO_SERVICE_METHOD` (default `POST`)

## Phase 1 run sequence

Install Locust outside Poetry for now (dependency conflict with app-pinned gevent):

```bash
pip3 install --user locust
```

1. Bootstrap users:

```bash
poetry run python -m tests_perf.bootstrap_accounts
```

2. Run Locust (dashboard scenario):

```bash
locust -f tests_perf/locustfile.py --host "$PERF_ADMIN_BASE_URL"
```

Headless example:

```bash
locust -f tests_perf/locustfile.py --host "$PERF_ADMIN_BASE_URL" --headless --users 5 --spawn-rate 1 --run-time 5m
```

## One-liner with HTML output

```bash
mkdir -p /tmp/tests_perf_results && PYTHONPATH=/workspace /workspace/.venv/bin/locust -f tests_perf/locustfile.py --host http://localhost:6012 --headless --users 5 --spawn-rate 1 --run-time 5m --html /tmp/tests_perf_results/perfrun.html --csv /tmp/tests_perf_results/perfrun
```

## Notes

- The add-to-service step is environment-specific and intentionally configurable in Phase 1.
- For staging, 2FA may require a non-static verification flow. This scaffold defaults to static code for local feasibility and fast iteration.
- The dashboard scenario models a page-view sequence: `/services/<id>/dashboard`, optional same-origin `/static/*` assets, then `/services/<id>/dashboard.json` polled at a fixed interval defined in `SCENARIOS`.
- Static assets are discovered from the dashboard HTML response (`<link>`, `<script>`, `<img>` paths under `/static/`) and fetched once per user session when `fetch_static_assets=True` on that step.
- Scenario flows are declared in `SCENARIOS` in `tests_perf/locustfile.py` so steps can be edited or new scenarios can be added without rewriting task logic.
- If you do not see `dashboard:static` in Locust output, enable `PERF_LOG_ASSET_DISCOVERY=true` to inspect discovery behavior.
