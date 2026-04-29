import json
import os
from dataclasses import dataclass
from itertools import cycle
from threading import Lock
from time import monotonic
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from locust import HttpUser, constant, task
from locust.exception import StopUser

from tests_perf.auth import AuthError, login_admin_session
from tests_perf.config import PerfConfig

_cfg = PerfConfig.from_env()

SKIP_STATIC_PATHS = {
    "/static/gov-canada-en.svg",
    "/static/goc--footer-logo.svg",
}

_accounts_lock = Lock()
_accounts_cycle = None


@dataclass(frozen=True)
class ScenarioStep:
    type: str
    path: str = ""
    name: str = ""
    save_response_as: str = ""
    fetch_static_assets: bool = False
    repeat_count_cfg: str = ""
    interval_seconds: float = 0.0
    interval_state_key: str = ""


@dataclass(frozen=True)
class Scenario:
    name: str
    steps: tuple[ScenarioStep, ...]


# Scenario flows are declared here so they are easy to read and edit.
SCENARIOS: dict[str, Scenario] = {
    "dashboard_view": Scenario(
        name="dashboard_view",
        steps=(
            ScenarioStep(
                type="get",
                path="/services/{service_id}/dashboard",
                name="dashboard:html",
                save_response_as="dashboard_html",
                fetch_static_assets=True,
            ),
            ScenarioStep(
                type="interval_get",
                path="/services/{service_id}/dashboard.json",
                name="dashboard:json",
                interval_seconds=5.0,
                interval_state_key="dashboard_json",
            ),
        ),
    )
}


def _load_accounts_cycle() -> cycle:
    global _accounts_cycle
    with _accounts_lock:
        if _accounts_cycle is None:
            with open(_cfg.accounts_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
            accounts = payload.get("accounts", [])
            if not accounts:
                raise RuntimeError("No accounts found. Run bootstrap first: poetry run python -m tests_perf.bootstrap_accounts")
            _accounts_cycle = cycle(accounts)
        return _accounts_cycle


def _next_account() -> dict:
    account_cycle = _load_accounts_cycle()
    with _accounts_lock:
        return next(account_cycle)


def _extract_static_assets(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    candidates = []

    for tag in soup.find_all("link"):
        href = tag.get("href")
        if href:
            candidates.append(href)

    for tag in soup.find_all("script"):
        src = tag.get("src")
        if src:
            candidates.append(src)

    for tag in soup.find_all("img"):
        src = tag.get("src")
        if src:
            candidates.append(src)

    unique_paths = []
    seen = set()

    for candidate in candidates:
        if not candidate:
            continue

        raw = candidate.strip()
        parsed = urlparse(raw)

        # Convert absolute URLs to request paths so Locust requests against configured host.
        if parsed.scheme in {"http", "https"}:
            path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        else:
            path = raw
            if path.startswith("static/"):
                path = "/" + path

        if not path.startswith("/static/"):
            continue

        if urlparse(path).path in SKIP_STATIC_PATHS:
            continue

        if path in seen:
            continue
        seen.add(path)
        unique_paths.append(path)

    return unique_paths


def _asset_name(asset_path: str) -> str:
    parsed = urlparse(asset_path)
    return parsed.path


class AdminDashboardUser(HttpUser):
    host = _cfg.admin_base_url
    wait_time = constant(1)

    def on_start(self) -> None:
        self._assets_fetched = False
        self._step_last_run_at = {}
        if not os.path.exists(_cfg.accounts_file):
            raise StopUser(f"Accounts file not found: {_cfg.accounts_file}")

        account = _next_account()
        regular = account.get("regular", {})
        email = regular.get("email_address")
        if not email:
            raise StopUser("Account record missing regular.email_address")

        try:
            login_admin_session(
                client=self.client,
                email=email,
                password=_cfg.user_password,
                two_factor_code=_cfg.two_factor_code,
                require_csrf=_cfg.require_csrf,
            )
        except AuthError as exc:
            raise StopUser(f"Authentication failed for {email}: {exc}") from exc

    def _run_step(self, step: ScenarioStep, context: dict) -> None:
        if step.type == "get":
            path = step.path.format(service_id=_cfg.target_service_id)
            response = self.client.get(path, name=step.name)
            if step.save_response_as:
                context[step.save_response_as] = response
            if step.fetch_static_assets:
                if not self._assets_fetched:
                    assets = _extract_static_assets(response.text)
                    if _cfg.log_asset_discovery:
                        preview = ", ".join(assets[:3]) if assets else "none"
                        print(f"[tests_perf] discovered static assets={len(assets)} preview={preview}")
                        if assets:
                            print("[tests_perf] static asset list:\n" + "\n".join(assets))
                    for asset_path in assets:
                        self.client.get(asset_path, name=f"dashboard:static:{_asset_name(asset_path)}")
                    self._assets_fetched = True
            return

        if step.type == "interval_get":
            interval_seconds = float(step.interval_seconds)
            state_key = step.interval_state_key or step.name
            now = monotonic()
            last_run = self._step_last_run_at.get(state_key)

            if last_run is not None and (now - last_run) < interval_seconds:
                return

            path = step.path.format(service_id=_cfg.target_service_id)
            self.client.get(path, name=step.name)
            self._step_last_run_at[state_key] = now
            return

        raise StopUser(f"Unknown scenario step type: {step.type}")

    def _run_scenario(self, scenario_name: str) -> None:
        scenario = SCENARIOS.get(scenario_name)
        if scenario is None:
            raise StopUser(f"Unknown scenario: {scenario_name}")

        context = {}
        for step in scenario.steps:
            self._run_step(step, context)

    @task
    def view_dashboard_page(self) -> None:
        self._run_scenario("dashboard_view")
