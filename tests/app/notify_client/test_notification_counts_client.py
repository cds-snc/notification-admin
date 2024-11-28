from unittest.mock import Mock, patch

import pytest

from app.notify_client.notification_counts_client import NotificationCounts


@pytest.fixture
def mock_redis():
    with patch("app.notify_client.notification_counts_client.redis_client") as mock:
        yield mock


@pytest.fixture
def mock_template_stats():
    with patch("app.notify_client.notification_counts_client.template_statistics_client") as mock:
        yield mock


@pytest.fixture
def mock_service_api():
    with patch("app.notify_client.notification_counts_client.service_api_client") as mock:
        yield mock


class TestNotificationCounts:
    def test_get_all_notification_counts_for_today_redis_has_data(self, mock_redis):
        # Setup
        mock_redis.get.side_effect = [5, 10]  # sms, email
        wrapper = NotificationCounts()

        # Execute
        result = wrapper.get_all_notification_counts_for_today("service-123")

        # Assert
        assert result == {"sms": 5, "email": 10}
        assert mock_redis.get.call_count == 2

    @pytest.mark.parametrize(
        "redis_side_effect, expected_result",
        [
            ([None, None], {"sms": 10, "email": 10}),
            ([None, 10], {"sms": 10, "email": 10}),  # Falls back to API if either is None
            ([10, None], {"sms": 10, "email": 10}),  # Falls back to API if either is None
        ],
    )
    def test_get_all_notification_counts_for_today_redis_missing_data(
        self, mock_redis, mock_template_stats, redis_side_effect, expected_result
    ):
        # Setup
        mock_redis.get.side_effect = redis_side_effect
        mock_template_stats.get_template_statistics_for_service.return_value = [
            {"template_id": "a1", "template_type": "sms", "count": 3, "status": "delivered"},
            {"template_id": "a2", "template_type": "email", "count": 7, "status": "temporary-failure"},
            {"template_id": "a3", "template_type": "email", "count": 3, "status": "delivered"},
            {"template_id": "a4", "template_type": "sms", "count": 7, "status": "delivered"},
        ]

        wrapper = NotificationCounts()

        # Execute
        result = wrapper.get_all_notification_counts_for_today("service-123")

        # Assert
        assert result == {"sms": 10, "email": 10}
        mock_template_stats.get_template_statistics_for_service.assert_called_once()

    def test_get_all_notification_counts_for_year(self, mock_service_api):
        # Setup
        mock_service_api.get_monthly_notification_stats.return_value = {
            "data": {
                "2024-01": {
                    "sms": {"sent": 1, "temporary-failure:": 22},
                    "email": {"delivered": 1, "permanent-failure": 1, "sending": 12, "technical-failure": 1},
                },
                "2024-02": {"sms": {"sent": 1}, "email": {"delivered": 1}},
            }
        }
        wrapper = NotificationCounts()

        with patch.object(wrapper, "get_all_notification_counts_for_today") as mock_today:
            mock_today.return_value = {"sms": 5, "email": 5}

            # Execute
            result = wrapper.get_all_notification_counts_for_year("service-123", 2024)

            # Assert
            assert result["sms"] == 29  # 1 + 22 + 1 + 5
            assert result["email"] == 21  # 1 + 1 + 12 + 1 + 1 + 5
