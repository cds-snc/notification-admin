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


newsletter_api_client = NewsletterAPIClient()
