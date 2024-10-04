from flask import current_app

from app.notify_client import NotifyAdminAPIClient


class SupportApiClient(NotifyAdminAPIClient):
    def init_app(self, app):
        super().init_app(app)
        self.admin_url = app.config["ADMIN_BASE_URL"]
        self.contact_email = app.config["CONTACT_EMAIL"]
        self.notify_user_id = app.config["NOTIFY_USER_ID"]
        self.notify_service_id = app.config["NOTIFY_SERVICE_ID"]

    def find_ids(self, ids):
        data = self.get("/support/find-ids", params={"ids": ids})
        current_app.logger.info(f"-----------\n {data}")
        return data


support_api_client = SupportApiClient()
