import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import dotenv_values


def _load_env_files() -> None:
    """Load perf env values from tests_perf/.env without overriding shell env vars."""

    repo_root = Path(__file__).resolve().parents[1]
    perf_env_file = repo_root / "tests_perf" / ".env"

    file_values = {}
    if perf_env_file.exists():
        file_values.update({k: v for k, v in dotenv_values(perf_env_file).items() if v is not None})

    for key, value in file_values.items():
        os.environ.setdefault(key, value)


def _resolve_container_localhost(url: str) -> str:
    """Map localhost URLs to host.docker.internal when running in a devcontainer."""

    if not url or not Path("/.dockerenv").exists():
        return url

    parsed = urlparse(url)
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        return url

    netloc = parsed.netloc
    if "@" in netloc:
        auth, host_port = netloc.rsplit("@", 1)
        host, sep, port = host_port.partition(":")
        new_host_port = f"host.docker.internal:{port}" if sep else "host.docker.internal"
        new_netloc = f"{auth}@{new_host_port}"
    else:
        host, sep, port = netloc.partition(":")
        new_netloc = f"host.docker.internal:{port}" if sep else "host.docker.internal"

    return urlunparse(parsed._replace(netloc=new_netloc))


@dataclass
class PerfConfig:
    api_base_url: str
    admin_base_url: str
    cypress_auth_user_name: str
    cypress_auth_client_secret: str
    user_password: str
    target_service_id: str
    user_count: int = 10
    two_factor_code: str = "12345"
    accounts_file: str = "/tmp/tests_perf_accounts.json"
    add_to_service_url_template: str = ""
    add_to_service_method: str = "POST"
    require_csrf: bool = True
    log_asset_discovery: bool = False

    @classmethod
    def from_env(cls) -> "PerfConfig":
        _load_env_files()

        cfg = cls(
            api_base_url=_resolve_container_localhost(os.environ.get("PERF_API_BASE_URL", "").rstrip("/")),
            admin_base_url=_resolve_container_localhost(os.environ.get("PERF_ADMIN_BASE_URL", "").rstrip("/")),
            cypress_auth_user_name=os.environ.get("PERF_CYPRESS_AUTH_USER_NAME", ""),
            cypress_auth_client_secret=os.environ.get("PERF_CYPRESS_AUTH_CLIENT_SECRET", ""),
            user_password=os.environ.get("PERF_USER_PASSWORD", ""),
            target_service_id=os.environ.get("PERF_TARGET_SERVICE_ID", ""),
            user_count=int(os.environ.get("PERF_USER_COUNT", "10")),
            two_factor_code=os.environ.get("PERF_2FA_CODE", "12345"),
            accounts_file=os.environ.get("PERF_ACCOUNTS_FILE", "/tmp/tests_perf_accounts.json"),
            add_to_service_url_template=os.environ.get("PERF_ADD_TO_SERVICE_URL_TEMPLATE", ""),
            add_to_service_method=os.environ.get("PERF_ADD_TO_SERVICE_METHOD", "POST").upper(),
            require_csrf=os.environ.get("PERF_REQUIRE_CSRF", "true").lower() in {"1", "true", "yes", "on"},
            log_asset_discovery=os.environ.get("PERF_LOG_ASSET_DISCOVERY", "false").lower() in {"1", "true", "yes", "on"},
        )
        cfg.validate()
        return cfg

    def validate(self) -> None:
        missing = []
        required = {
            "PERF_API_BASE_URL": self.api_base_url,
            "PERF_ADMIN_BASE_URL": self.admin_base_url,
            "PERF_CYPRESS_AUTH_USER_NAME": self.cypress_auth_user_name,
            "PERF_CYPRESS_AUTH_CLIENT_SECRET": self.cypress_auth_client_secret,
            "PERF_USER_PASSWORD": self.user_password,
            "PERF_TARGET_SERVICE_ID": self.target_service_id,
        }

        for key, value in required.items():
            if not value:
                missing.append(key)

        if missing:
            raise ValueError(f"Missing required env vars: {', '.join(missing)}")
