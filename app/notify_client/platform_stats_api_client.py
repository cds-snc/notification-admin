from app.notify_client import NotifyAdminAPIClient


class PlatformStatsAPIClient(NotifyAdminAPIClient):

    def get_aggregate_platform_stats(self, params_dict=None):
        return self.get("/platform-stats", params=params_dict)

    def usage_for_trial_services(self):
        return self.get(url='/platform-stats/usage-for-trial-services')


platform_stats_api_client = PlatformStatsAPIClient()
