from datetime import datetime, timedelta

from app import cache
from app.notify_client import NotifyAdminAPIClient


class AnnualTotalsClient(NotifyAdminAPIClient):
    def _seconds_until_midnight():
        now = datetime.now()
        midnight = datetime.combine(now + timedelta(days=1), datetime.min.time())
        return int((midnight - now).total_seconds())

    def _get_fiscal_year():
        today = datetime.utcnow()
        if today.month >= 4:
            return today.year
        return today.year - 1

    @cache.memoize(timeout=_seconds_until_midnight())
    def get_total_notifications_sent_this_year(self, service_id):
        """
        This methods gets a service's total notification counts for the fiscal year, excluding today.  It is cached for subsequent calls until midnight.
        """
        fiscal_year = self._get_fiscal_year()
        counts = {"sms": 0, "email": 0, "letter": 0}

        notification_data = self.get(
            url="/service/{}/notifications/monthly?year={}&exclude_today=True".format(service_id, fiscal_year)
        )

        # sum the notifications
        for month_data in notification_data["data"].values():
            for message_type, message_counts in month_data.items():
                if isinstance(message_counts, dict):
                    counts[message_type] += sum(message_counts.values())

        # return the result
        return counts


annual_totals_client = AnnualTotalsClient()
