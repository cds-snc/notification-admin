from app.notify_client import NotifyAdminAPIClient
from app.notify_client.cache import set


class NewsletterAPIClient(NotifyAdminAPIClient):
    def create_unconfirmed_subscriber(self, email: str, language: str):
        """
        Create an unconfirmed newsletter subscriber.

        Args:
            email: Email address of the subscriber
            language: Language preference (e.g., 'en' or 'fr')

        Returns:
            Response from the API
        """
        data = {"email": email, "language": language}
        resp = self.post(url="/newsletter/unconfirmed-subscriber", data=data)
        return resp

    def confirm_subscriber(self, subscriber_id: str):
        resp = self.get(url=f"/newsletter/confirm/{subscriber_id}")
        return resp

    def unsubscribe(self, subscriber_id: str):
        resp = self.get(url=f"/newsletter/unsubscribe/{subscriber_id}")
        return resp

    def update_language(self, subscriber_id: str, language: str):
        data = {"language": language}
        resp = self.post(url=f"/newsletter/update-language/{subscriber_id}", data=data)
        return resp

    def send_latest_newsletter(self, subscriber_id: str):
        # TODO: Implement actual API endpoint
        # resp = self.post(url=f"/newsletter/send-latest/{subscriber_id}", data={})
        # return resp
        return

    @set("subscriber-{subscriber_id}")
    def get_subscriber(self, subscriber_id: str):
        resp = self.get(url=f"/newsletter/find-subscriber?subscriber_id={subscriber_id}")
        return resp


newsletter_api_client = NewsletterAPIClient()
