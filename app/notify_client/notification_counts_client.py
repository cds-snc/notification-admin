from notifications_utils.clients.redis.annual_limit import (
    EMAIL_DELIVERED_TODAY,
    EMAIL_FAILED_TODAY,
    SMS_DELIVERED_TODAY,
    SMS_FAILED_TODAY,
    TOTAL_EMAIL_FISCAL_YEAR_TO_YESTERDAY,
    TOTAL_SMS_FISCAL_YEAR_TO_YESTERDAY,
)

from app import service_api_client
from app.extensions import annual_limit_client
from app.models.service import Service


class NotificationCounts:
    def get_total_notification_count(self, service: Service):
        """
        Get the total number of notifications sent by a service
        Args:
            service_id (str): The ID of the service
        Returns:
            int: The total number of notifications sent by the service
        """

        annual_limit_data = {}
        if annual_limit_client.was_seeded_today(service.id):
            # get data from redis
            annual_limit_data = annual_limit_client.get_all_notification_counts(service.id)
        else:
            # get data from db
            annual_limit_data = service_api_client.get_year_to_date_service_statistics(service.id)

        # transform data so dashboard can use it
        return {
            "sms": annual_limit_data[TOTAL_SMS_FISCAL_YEAR_TO_YESTERDAY]
            + annual_limit_data[SMS_FAILED_TODAY]
            + annual_limit_data[SMS_DELIVERED_TODAY],
            "email": annual_limit_data[TOTAL_EMAIL_FISCAL_YEAR_TO_YESTERDAY]
            + annual_limit_data[EMAIL_FAILED_TODAY]
            + annual_limit_data[EMAIL_DELIVERED_TODAY],
        }

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

        annual_limit_data = {}
        if annual_limit_client.was_seeded_today(service.id):
            # get data from redis
            annual_limit_data = annual_limit_client.get_all_notification_counts(service.id)
        else:
            # get data from the api
            annual_limit_data = service_api_client.get_year_to_date_service_statistics(service.id)

        limit_stats = {
            "email": {
                "annual": {
                    "limit": service.email_annual_limit,
                    "sent": annual_limit_data[TOTAL_EMAIL_FISCAL_YEAR_TO_YESTERDAY]
                    + annual_limit_data[EMAIL_FAILED_TODAY]
                    + annual_limit_data[EMAIL_DELIVERED_TODAY],
                    "remaining": service.email_annual_limit
                    - (
                        annual_limit_data[TOTAL_EMAIL_FISCAL_YEAR_TO_YESTERDAY]
                        + annual_limit_data[EMAIL_FAILED_TODAY]
                        + annual_limit_data[EMAIL_DELIVERED_TODAY]
                    ),
                },
                "daily": {
                    "limit": service.message_limit,
                    "sent": annual_limit_data[EMAIL_FAILED_TODAY] + annual_limit_data[EMAIL_DELIVERED_TODAY],
                    "remaining": service.message_limit
                    - (annual_limit_data[EMAIL_DELIVERED_TODAY] + annual_limit_data[EMAIL_FAILED_TODAY]),
                },
            },
            "sms": {
                "annual": {
                    "limit": service.sms_annual_limit,
                    "sent": annual_limit_data[TOTAL_SMS_FISCAL_YEAR_TO_YESTERDAY]
                    + annual_limit_data[SMS_FAILED_TODAY]
                    + annual_limit_data[SMS_DELIVERED_TODAY],
                    "remaining": service.sms_annual_limit
                    - (
                        annual_limit_data[TOTAL_SMS_FISCAL_YEAR_TO_YESTERDAY]
                        + annual_limit_data[SMS_FAILED_TODAY]
                        + annual_limit_data[SMS_DELIVERED_TODAY]
                    ),
                },
                "daily": {
                    "limit": service.sms_daily_limit,
                    "sent": annual_limit_data[SMS_FAILED_TODAY] + annual_limit_data[SMS_DELIVERED_TODAY],
                    "remaining": service.sms_daily_limit
                    - (annual_limit_data[SMS_DELIVERED_TODAY] + annual_limit_data[SMS_FAILED_TODAY]),
                },
            },
        }

        return limit_stats


notification_counts_client = NotificationCounts()
