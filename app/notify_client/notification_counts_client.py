from datetime import datetime

from notifications_utils.clients.redis import (
    email_daily_count_cache_key,
    sms_daily_count_cache_key,
)

from app import redis_client, service_api_client, template_statistics_client
from app.models.service import Service


class NotificationCounts:
    def get_all_notification_counts_for_today(self, service_id):
        # try to get today's stats from redis
        todays_sms = redis_client.get(sms_daily_count_cache_key(service_id))
        todays_email = redis_client.get(email_daily_count_cache_key(service_id))

        if todays_sms is not None and todays_email is not None:
            return {"sms": todays_sms, "email": todays_email}
        # fallback to the API if the stats are not in redis
        else:
            stats = template_statistics_client.get_template_statistics_for_service(service_id, limit_days=1)
            transformed_stats = _aggregate_notifications_stats(stats)

            return transformed_stats

    def get_all_notification_counts_for_year(self, service_id, year):
        """
        Get total number of notifications by type for the current service for the current year

        Return value:
        {
            'sms': int,
            'email': int
        }

        """
        stats_today = self.get_all_notification_counts_for_today(service_id)
        stats_this_year = service_api_client.get_monthly_notification_stats(service_id, year)["data"]
        stats_this_year = _aggregate_stats_from_service_api(stats_this_year)
        # aggregate stats_today and stats_this_year
        for template_type in ["sms", "email"]:
            stats_this_year[template_type] += stats_today[template_type]

        return stats_this_year

    def get_limit_stats(self, service: Service):
        """
        Get the limit stats for the current service, by notification type, including:
         - how many notifications were sent today and this year
         - the monthy and daily limits
         - the number of notifications remaining today and this year

        Returns:
            dict: A dictionary containing the limit stats for email and SMS notifications. The structure is as follows:
                {
                    "email": {
                        "annual": {
                            "limit": int,  # The annual limit for email notifications
                            "sent": int,   # The number of email notifications sent this year
                            "remaining": int,  # The number of email notifications remaining this year
                        },
                        "daily": {
                            "limit": int,  # The daily limit for email notifications
                            "sent": int,   # The number of email notifications sent today
                            "remaining": int,  # The number of email notifications remaining today
                        },
                    },
                    "sms": {
                        "annual": {
                            "limit": int,  # The annual limit for SMS notifications
                            "sent": int,   # The number of SMS notifications sent this year
                            "remaining": int,  # The number of SMS notifications remaining this year
                        },
                        "daily": {
                            "limit": int,  # The daily limit for SMS notifications
                            "sent": int,   # The number of SMS notifications sent today
                            "remaining": int,  # The number of SMS notifications remaining today
                        },
                    }
                }
        """

        sent_today = self.get_all_notification_counts_for_today(service.id)
        sent_thisyear = self.get_all_notification_counts_for_year(service.id, datetime.now().year)

        limit_stats = {
            "email": {
                "annual": {
                    "limit": service.email_annual_limit,
                    "sent": sent_thisyear["email"],
                    "remaining": service.email_annual_limit - sent_thisyear["email"],
                },
                "daily": {
                    "limit": service.message_limit,
                    "sent": sent_today["email"],
                    "remaining": service.message_limit - sent_today["email"],
                },
            },
            "sms": {
                "annual": {
                    "limit": service.sms_annual_limit,
                    "sent": sent_thisyear["sms"],
                    "remaining": service.sms_annual_limit - sent_thisyear["sms"],
                },
                "daily": {
                    "limit": service.sms_daily_limit,
                    "sent": sent_today["sms"],
                    "remaining": service.sms_daily_limit - sent_today["sms"],
                },
            },
        }

        return limit_stats


# TODO: consolidate this function and other functions that transform the results of template_statistics_client calls
def _aggregate_notifications_stats(template_statistics):
    template_statistics = _filter_out_cancelled_stats(template_statistics)
    notifications = {"sms": 0, "email": 0}
    for stat in template_statistics:
        notifications[stat["template_type"]] += stat["count"]

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

    return {msg_type: sum(counts.values()) for msg_type, counts in total_stats.items()}


notification_counts_client = NotificationCounts()
