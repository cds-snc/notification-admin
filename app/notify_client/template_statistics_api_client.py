from app.notify_client import NotifyAdminAPIClient


class TemplateStatisticsApiClient(NotifyAdminAPIClient):
    def get_template_statistics_for_service(self, service_id, limit_days=None):
        params = {}
        if limit_days is not None:
            params["limit_days"] = limit_days

        return self.get(url="/service/{}/template-statistics".format(service_id), params=params)["data"]

    def get_monthly_template_usage_for_service(self, service_id, year, page=None, page_size=None):
        params = {"year": year}
        if page is not None:
            params["page"] = page
        if page_size is not None:
            params["page_size"] = page_size

        return self.get(url="/service/{}/notifications/templates_usage/monthly".format(service_id), params=params)

    def get_template_statistics_for_template(self, service_id, template_id):
        return self.get(url="/service/{}/template-statistics/{}".format(service_id, template_id))["data"]


template_statistics_client = TemplateStatisticsApiClient()
