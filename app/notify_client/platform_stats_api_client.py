from app.notify_client import NotifyAdminAPIClient


class PlatformStatsAPIClient(NotifyAdminAPIClient):
    def get_aggregate_platform_stats(self, params_dict=None):
        return self.get("/platform-stats", params=params_dict)

    def get_send_method_stats_by_service(self, start_date, end_date) -> list[dict[str, str]]:
        return self.get(
            "/platform-stats/send-method-stats-by-service",
            params={
                "start_date": start_date,
                "end_date": end_date,
            },
        )  # type: ignore

    def usage_for_trial_services(self) -> list[dict[str, str]]:
        return self.get(url="/platform-stats/usage-for-trial-services")  # type: ignore


platform_stats_api_client = PlatformStatsAPIClient()
