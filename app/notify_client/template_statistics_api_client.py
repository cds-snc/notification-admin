from itertools import groupby

from app.notify_client import NotifyAdminAPIClient
from app.utils import DELIVERED_STATUSES, FAILURE_STATUSES


class TemplateStatisticsApiClient(NotifyAdminAPIClient):
    def get_template_statistics_for_service(self, service_id, limit_days=None):
        params = {}
        if limit_days is not None:
            params["limit_days"] = limit_days

        return self.get(url="/service/{}/template-statistics".format(service_id), params=params)["data"]

    def get_monthly_template_usage_for_service(self, service_id, year):
        return self.get(url="/service/{}/notifications/templates_usage/monthly?year={}".format(service_id, year))["stats"]

    def get_template_statistics_for_template(self, service_id, template_id):
        return self.get(url="/service/{}/template-statistics/{}".format(service_id, template_id))["data"]



template_statistics_client = TemplateStatisticsApiClient()

class TemplateStatistics:
    def __init__(self, stats):
        self.stats = stats

    def as_aggregates(self):
        template_statistics = self._filter_out_cancelled_stats(self.stats)
        notifications = {
            template_type: {status: 0 for status in ("requested", "delivered", "failed")} for template_type in ["sms", "email"]
        }
        for stat in template_statistics:
            notifications[stat["template_type"]]["requested"] += stat["count"]
            if stat["status"] in DELIVERED_STATUSES:
                notifications[stat["template_type"]]["delivered"] += stat["count"]
            elif stat["status"] in FAILURE_STATUSES:
                notifications[stat["template_type"]]["failed"] += stat["count"]

        return notifications

    def as_template_usage(self, sort_key="count"):
        template_statistics = self._filter_out_cancelled_stats(self.stats)
        templates = []
        for k, v in groupby(
            sorted(template_statistics, key=lambda x: x["template_id"]),
            key=lambda x: x["template_id"],
        ):
            template_stats = list(v)

            templates.append(
                {
                    "template_id": k,
                    "template_name": template_stats[0]["template_name"],
                    "template_type": template_stats[0]["template_type"],
                    "is_precompiled_letter": template_stats[0]["is_precompiled_letter"],
                    "count": sum(s["count"] for s in template_stats),
                }
            )

        return sorted(templates, key=lambda x: x[sort_key], reverse=True)

    def _filter_out_cancelled_stats(self, template_statistics):
        return [s for s in template_statistics if s["status"] != "cancelled"]
