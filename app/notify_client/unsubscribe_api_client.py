from contextvars import ContextVar

from flask import current_app
from notifications_python_client.errors import HTTPError
from notifications_utils.local_vars import LazyLocalGetter
from werkzeug.local import LocalProxy

from app.notify_client import NotifyAdminAPIClient


class UnsubscribeApiClient(NotifyAdminAPIClient):
    def unsubscribe(self, notification_id, token):
        """POST to the API's one-click unsubscribe endpoint. Returns True on success, False on 404."""
        try:
            self.post(f"/unsubscribe/{notification_id}/{token}", data=None)
        except HTTPError as e:
            if e.status_code == 404:
                return False
            raise e
        return True


_unsubscribe_api_client_context_var: ContextVar[UnsubscribeApiClient] = ContextVar("unsubscribe_api_client")
get_unsubscribe_api_client: LazyLocalGetter[UnsubscribeApiClient] = LazyLocalGetter(
    _unsubscribe_api_client_context_var,
    lambda: UnsubscribeApiClient(current_app),
)
unsubscribe_api_client = LocalProxy(get_unsubscribe_api_client)
