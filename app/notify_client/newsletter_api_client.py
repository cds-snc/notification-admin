from app.notify_client import NotifyAdminAPIClient


class NewsletterAPIClient(NotifyAdminAPIClient):
    def create_unconfirmed_subscriber(self, email, language):
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

    def confirm_subscriber(self, subscriber_id):
        # we will switch to this once the api is updated
        # resp = self.get(url=f"/newsletter/confirm/{subscriber_id}")

        resp = self.post(url=f"/newsletter/confirm/{subscriber_id}", data={})
        return resp


newsletter_api_client = NewsletterAPIClient()
