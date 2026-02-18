from flask import current_app
from notifications_utils.clients.redis import (
    billable_units_sms_daily_count_cache_key,
    email_daily_count_cache_key,
    sms_daily_count_cache_key,
)

from app import redis_client, service_api_client, template_statistics_client
from app.extensions import annual_limit_client
from app.models.service import Service
from app.utils import get_current_financial_year


class NotificationCounts:
    def get_all_notification_counts_for_today(self, service_id):
        # try to get today's stats from redis
        # TODO FF_USE_BILLABLE_UNITS removal - Use billable units when feature flag is enabled
        if current_app.config.get("FF_USE_BILLABLE_UNITS"):
            todays_sms_val = redis_client.get(billable_units_sms_daily_count_cache_key(service_id))
            todays_sms = int(todays_sms_val) if todays_sms_val is not None else None
        else:
            todays_sms_val = redis_client.get(sms_daily_count_cache_key(service_id))
            todays_sms = int(todays_sms_val) if todays_sms_val is not None else None

        todays_email = redis_client.get(email_daily_count_cache_key(service_id))
        todays_email = int(todays_email) if todays_email is not None else None

        if todays_sms is not None and todays_email is not None:
            return {"sms": todays_sms, "email": todays_email}
        # fallback to the API if the stats are not in redis
        else:
            use_billable_units = current_app.config.get("FF_USE_BILLABLE_UNITS", False)
            stats = template_statistics_client.get_template_statistics_for_service(service_id, limit_days=1)
            transformed_stats = _aggregate_notifications_stats(stats, use_billable_units=use_billable_units)

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

        current_financial_year = get_current_financial_year()
        use_billable_units = current_app.config.get("FF_USE_BILLABLE_UNITS", False)
        redis_enabled = current_app.config.get("REDIS_ENABLED", False)
        sent_today = self.get_all_notification_counts_for_today(service.id)

        # TODO FF_USE_BILLABLE_UNITS removal - Use billable units when feature flag is enabled
        if use_billable_units and redis_enabled:
            # Use Redis annual_limit_client for annual stats (same data source as dashboard)
            annual_data_redis = annual_limit_client.get_all_notification_counts(service.id)
            sms_annual_sent = annual_data_redis.get("total_sms_billable_units_fiscal_year_to_yesterday", 0) + sent_today["sms"]
            email_annual_sent = annual_data_redis.get("total_email_fiscal_year_to_yesterday", 0) + sent_today["email"]
        else:
            # We are interested in getting data for the financial year, not the calendar year
            # (also used as fallback when Redis is not enabled)
            sent_thisyear = self.get_all_notification_counts_for_year(service.id, current_financial_year)
            sms_annual_sent = sent_thisyear["sms"]
            email_annual_sent = sent_thisyear["email"]

        limit_stats = {
            "email": {
                "annual": {
                    "limit": service.email_annual_limit,
                    "sent": email_annual_sent,
                    "remaining": service.email_annual_limit - email_annual_sent,
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
                    "sent": sms_annual_sent,
                    "remaining": service.sms_annual_limit - sms_annual_sent,
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
def _aggregate_notifications_stats(template_statistics, use_billable_units=False):
    template_statistics = _filter_out_cancelled_stats(template_statistics)
    # The API returns both 'count' and 'billable_units' fields.
    # Use 'billable_units' when tracking against limits (FF_USE_BILLABLE_UNITS), otherwise use 'count'.
    if use_billable_units and template_statistics and "billable_units" in template_statistics[0]:
        count_field = "billable_units"
    else:
        count_field = "count"
    notifications = {"sms": 0, "email": 0}
    for stat in template_statistics:
        notifications[stat["template_type"]] += stat[count_field]

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
