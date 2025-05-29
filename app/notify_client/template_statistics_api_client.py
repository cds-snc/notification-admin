from app.notify_client import NotifyAdminAPIClient


class TemplateStatisticsApiClient(NotifyAdminAPIClient):
    def get_template_statistics_for_service(self, service_id, limit_days=None):
        params = {}
        if limit_days is not None:
            params["limit_days"] = limit_days

        # data = self.get(url="/service/{}/template-statistics".format(service_id), params=params)["data"]
        data = [
            {
                "count": 472632,
                "template_id": "52715985-d952-45a3-8d67-d506a55f711d",
                "template_name": "drupalwxt_message",
                "template_type": "email",
                "is_precompiled_letter": False,
                "status": "delivered",
            },
            {
                "count": 3306,
                "template_id": "52715985-d952-45a3-8d67-d506a55f711d",
                "template_name": "drupalwxt_message",
                "template_type": "email",
                "is_precompiled_letter": False,
                "status": "permanent-failure",
            },
            {
                "count": 575,
                "template_id": "52715985-d952-45a3-8d67-d506a55f711d",
                "template_name": "drupalwxt_message",
                "template_type": "email",
                "is_precompiled_letter": False,
                "status": "sending",
            },
            {
                "count": 8207,
                "template_id": "52715985-d952-45a3-8d67-d506a55f711d",
                "template_name": "drupalwxt_message",
                "template_type": "email",
                "is_precompiled_letter": False,
                "status": "temporary-failure",
            },
        ]
        return data

    def get_monthly_template_usage_for_service(self, service_id, year):
        return self.get(url="/service/{}/notifications/templates_usage/monthly?year={}".format(service_id, year))["stats"]

    def get_template_statistics_for_template(self, service_id, template_id):
        return self.get(url="/service/{}/template-statistics/{}".format(service_id, template_id))["data"]


template_statistics_client = TemplateStatisticsApiClient()
