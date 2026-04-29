import base64
import hashlib
import hmac
import json
import os
import random
import string
import time
from typing import Any

import requests

from tests_perf.config import PerfConfig


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _create_hs256_jwt(username: str, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"iss": username, "iat": int(time.time())}

    encoded_header = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")

    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_signature = _b64url(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def _random_suffix(length: int = 10) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def _auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _request_json(method: str, url: str, headers: dict[str, str]) -> Any:
    resp = requests.request(method=method, url=url, headers=headers, timeout=30)
    resp.raise_for_status()
    if not resp.text:
        return {}
    return resp.json()


def _attach_user_to_service_if_configured(cfg: PerfConfig, token: str, user_id: str) -> None:
    if not cfg.add_to_service_url_template:
        return

    url = cfg.add_to_service_url_template.format(
        base_url=cfg.api_base_url,
        service_id=cfg.target_service_id,
        user_id=user_id,
    )
    _request_json(cfg.add_to_service_method, url, _auth_headers(token))


def bootstrap_accounts(cfg: PerfConfig) -> dict[str, Any]:
    token = _create_hs256_jwt(cfg.cypress_auth_user_name, cfg.cypress_auth_client_secret)

    cleanup_url = f"{cfg.api_base_url}/cypress/cleanup"
    _request_json("GET", cleanup_url, _auth_headers(token))

    accounts = []
    for _ in range(cfg.user_count):
        username = _random_suffix()
        create_url = f"{cfg.api_base_url}/cypress/create_user/{username}"
        created = _request_json("POST", create_url, _auth_headers(token))

        regular = created.get("regular", {})
        regular_id = regular.get("id")
        if regular_id:
            _attach_user_to_service_if_configured(cfg, token, regular_id)

        accounts.append(
            {
                "admin": created.get("admin", {}),
                "regular": regular,
            }
        )

    result = {
        "generated_at": int(time.time()),
        "target_service_id": cfg.target_service_id,
        "user_count": cfg.user_count,
        "accounts": accounts,
    }

    output_dir = os.path.dirname(cfg.accounts_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(cfg.accounts_file, "w", encoding="utf-8") as f:
        json.dump(result, f)

    return result


def main() -> None:
    cfg = PerfConfig.from_env()
    result = bootstrap_accounts(cfg)
    print(
        json.dumps(
            {
                "accounts_file": cfg.accounts_file,
                "user_count": result["user_count"],
                "target_service_id": result["target_service_id"],
            }
        )
    )


if __name__ == "__main__":
    main()
