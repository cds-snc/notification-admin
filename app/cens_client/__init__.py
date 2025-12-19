import logging
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)


class CensClient:
    """Simple client for talking to CENS provider endpoints.

    Usage:
        client = CensClient()
        client.init_app(app)

    The client fetches a short-lived token for every request by calling
    the provider `get-token` endpoint using credentials from app config.
    """

    def __init__(self, testing_mode: bool = False):
        self.base_url: Optional[str] = None
        self.client_id: Optional[str] = None
        self.client_secret: Optional[str] = None
        self.testing_mode = testing_mode

    def init_app(self, app):
        self.base_url = app.config.get("CENS_URL")
        self.client_id = app.config.get("CENS_USER")
        self.client_secret = app.config.get("CENS_SECRET")
        # optional testing mode flag in app config
        self.testing_mode = bool(app.config.get("CENS_TESTING_MODE", self.testing_mode))

    def _form_url(self, path: str) -> str:
        if not self.base_url:
            raise RuntimeError("CENS client not configured with base URL")
        return f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"

    def get_token(self) -> str:
        """Request a token from the provider using client credentials.

        Returns the token string on success, raises requests.HTTPError on failure.
        """
        if self.testing_mode:
            # return a stable test token
            return "test-token"

        url = self._form_url("get-token")
        data = {"clientId": self.client_id or "", "clientSecret": self.client_secret or ""}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        resp = requests.post(url, data=data, headers=headers, timeout=10)
        try:
            resp.raise_for_status()
        except requests.HTTPError:
            logger.exception("Failed to fetch CENS token")
            raise

        json = resp.json()
        token = json.get("token")
        if not token:
            raise RuntimeError("CENS token missing from response")
        return token

    def has_service(self, service_id: str) -> bool:
        """Return True if provider has topics for given service_id."""
        if self.testing_mode:
            # in testing mode assume service has topics
            return True

        token = self.get_token()
        url = self._form_url("provider/has-service")
        data = {"serviceId": service_id}
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Bearer {token}",
        }

        resp = requests.post(url, data=data, headers=headers, timeout=10)
        resp.raise_for_status()
        json = resp.json()
        return bool(json.get("exists", False))

    def get_subscribers_list(self, service_id: str) -> Dict[str, Any]:
        """Return the raw JSON response listing subscribers for a service.

        The response is expected to include keys like `name`, `service-id` and `rows`.
        """
        if self.testing_mode:
            return {
                "name": "CENS Topic 123",
                "template_id": "bcd2d833-e087-4bb3-81d5-39da32fa361a",
                "rows": [
                    ["email address", "unsub_link"],
                    [
                        "andrew.leith+1@cds-snc.ca",
                        "https://apps.canada.ca/cens2/subs/remove/{subsCode1}/F853e0212b92a127",
                    ],
                    [
                        "andrew.leith+2@cds-snc.ca",
                        "https://apps.canada.ca/cens2/subs/remove/{subsCode2}/F853e0212b92a127",
                    ],
                ],
            }

        token = self.get_token()
        url = self._form_url("provider/get-subscribers")
        data = {"serviceId": service_id}
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Bearer {token}",
        }

        resp = requests.post(url, data=data, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()


# convenience single client instance used by the app
cens_client = CensClient()
