from notifications_utils.clients.redis.annual_limit import RedisAnnualLimit
from notifications_utils.clients.redis.redis_client import RedisClient

from app import service_api_client, template_statistics_client
from app.utils import DELIVERED_STATUSES, FAILURE_STATUSES


class AnnualLimitWrapper:
    def __init__(self, client):
        self.client = client


    def get_all_notification_counts_for_today(self, service_id):
        """
        Get total number of notifications by type for the current service

        Return value:
        {
            'sms': {'requested': int, 'delivered': int, 'failed': int}
            'email': {'requested': int, 'delivered': int, 'failed': int}
        }

        """
        if self.client.was_seeded_today(service_id):
            # annual limits client returns this data structure:
            # {
            #   sms_delivered: int,
            #   email_delivered: int,
            #   sms_failed: int,
            #   email_failed: int
            # }
            stats = self.client.get_all_notification_counts(service_id)

            return {
                "sms": {
                    "requested": stats["sms_delivered"] + stats["sms_failed"],
                    "delivered": stats["sms_delivered"],
                    "failed": stats["sms_failed"]
                },
                "email": {
                    "requested": stats["email_delivered"] + stats["email_failed"],
                    "delivered": stats["email_delivered"],
                    "failed": stats["email_failed"]
                }
            }
        else:
            stats = template_statistics_client.get_template_statistics_for_service(service_id, limit_days=1)
            transformed_stats = _aggregate_notifications_stats(stats)

            return transformed_stats

    def get_all_notification_counts_for_year(self, service_id, year):
        """
        Get total number of notifications by type for the current service for the current year

        Return value:
        {
            'sms': {'requested': int, 'delivered': int, 'failed': int}
            'email': {'requested': int, 'delivered': int, 'failed': int}
        }

        """
        stats_today = self.get_all_notification_counts_for_today(service_id)
        stats_this_year = service_api_client.get_monthly_notification_stats(service_id, year)["data"]
        stats_this_year = _aggregate_stats_from_service_api(stats_this_year)
        # aggregate stats_today and stats_this_year
        for template_type in ["sms", "email"]:
            for status in ["requested", "delivered", "failed"]:
                stats_this_year[template_type][status] += stats_today[template_type][status]

        return stats_this_year

    def get_all_notification_counts_ytd(self, service_id, year):
        """
        Get total number of notifications by type for the current service for the year to date

        Return value:
        {
            'sms': {'requested': int, 'delivered': int, 'failed': int}
            'email': {'requested': int, 'delivered': int, 'failed': int}
        }

        """
        stats_today = self.get_all_notification_counts_for_today(service_id)
        stats_this_year = self.get_all_notification_counts_for_year(service_id, year)

        # aggregate stats_today and stats_this_year
        for template_type in ["sms", "email"]:
            for status in ["requested", "delivered", "failed"]:
                stats_this_year[template_type][status] += stats_today[template_type][status]

        return stats_this_year

# TODO: consolidate this function and other functions that transform the results of template_statistics_client calls
def _aggregate_notifications_stats(template_statistics):
    template_statistics = _filter_out_cancelled_stats(template_statistics)
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

def _filter_out_cancelled_stats(template_statistics):
    return [s for s in template_statistics if s["status"] != "cancelled"]

def _aggregate_stats_from_service_api(stats):
    """Aggregate monthly notification stats excluding cancelled"""
    total_stats = {"sms": {}, "email": {}}

    for month_data in stats.values():
        for msg_type in ["sms", "email"]:
            if msg_type in month_data:
                for status, count in month_data[msg_type].items():
                    if status != "cancelled":
                        if status not in total_stats[msg_type]:
                            total_stats[msg_type][status] = 0
                        total_stats[msg_type][status] += count

    return {
        msg_type: {
            "requested": sum(counts.values()),
            "delivered": sum(counts.get(status, 0) for status in DELIVERED_STATUSES),
            "failed": sum(counts.get(status, 0) for status in FAILURE_STATUSES)
        }
        for msg_type, counts in total_stats.items()
    }

annual_limit_client = AnnualLimitWrapper(RedisAnnualLimit(RedisClient()))
