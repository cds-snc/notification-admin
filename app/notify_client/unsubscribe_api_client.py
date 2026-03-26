from notifications_python_client.errors import HTTPError

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


unsubscribe_api_client = UnsubscribeApiClient()
