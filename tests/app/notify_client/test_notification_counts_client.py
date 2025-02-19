from unittest.mock import Mock

from app.notify_client.notification_counts_client import NotificationCounts


class TestNotificationCounts:
    def test_get_limit_stats_redis_on(self, mocker):
        # Setup
        mock_service = Mock(id="service-1", email_annual_limit=1000, sms_annual_limit=500, message_limit=100, sms_daily_limit=50)

        mock_notification_client = NotificationCounts()

        # Mock was_seeded_today to return True so we use Redis
        mocker.patch("app.notify_client.notification_counts_client.annual_limit_client.was_seeded_today", return_value=True)

        # Mock get_all_notification_counts
        mocker.patch(
            "app.notify_client.notification_counts_client.annual_limit_client.get_all_notification_counts",
            return_value={
                "sms_delivered_today": 5,
                "email_delivered_today": 10,
                "sms_failed_today": 5,
                "email_failed_today": 10,
                "total_sms_fiscal_year_to_yesterday": 90,
                "total_email_fiscal_year_to_yesterday": 180,
            },
        )

        # Execute
        result = mock_notification_client.get_limit_stats(mock_service)

        # Assert
        assert result == {
            "email": {
                "annual": {
                    "limit": 1000,
                    "sent": 200,
                    "remaining": 800,
                },
                "daily": {
                    "limit": 100,
                    "sent": 20,
                    "remaining": 80,
                },
            },
            "sms": {
                "annual": {
                    "limit": 500,
                    "sent": 100,
                    "remaining": 400,
                },
                "daily": {
                    "limit": 50,
                    "sent": 10,
                    "remaining": 40,
                },
            },
        }

    def test_get_limit_stats_redis_off(self, mocker):
        # Setup
        mock_service = Mock(id="service-1", email_annual_limit=1000, sms_annual_limit=500, message_limit=100, sms_daily_limit=50)

        mock_notification_client = NotificationCounts()

        # Mock was_seeded_today to return True so we use Redis
        mocker.patch("app.notify_client.notification_counts_client.annual_limit_client.was_seeded_today", return_value=False)

        # Mock get_all_notification_counts
        mocker.patch(
            "app.notify_client.notification_counts_client.service_api_client.get_year_to_date_service_statistics",
            return_value={
                "sms_delivered_today": 5,
                "email_delivered_today": 10,
                "sms_failed_today": 5,
                "email_failed_today": 10,
                "total_sms_fiscal_year_to_yesterday": 90,
                "total_email_fiscal_year_to_yesterday": 180,
            },
        )

        # Execute
        result = mock_notification_client.get_limit_stats(mock_service)

        # Assert
        assert result == {
            "email": {
                "annual": {
                    "limit": 1000,
                    "sent": 200,
                    "remaining": 800,
                },
                "daily": {
                    "limit": 100,
                    "sent": 20,
                    "remaining": 80,
                },
            },
            "sms": {
                "annual": {
                    "limit": 500,
                    "sent": 100,
                    "remaining": 400,
                },
                "daily": {
                    "limit": 50,
                    "sent": 10,
                    "remaining": 40,
                },
            },
        }
