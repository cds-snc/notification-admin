from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from app.notify_client.notification_counts_client import NotificationCounts
from app.utils import get_current_financial_year


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


@pytest.fixture
def mock_get_all_notification_counts_for_today():
    with patch("app.notify_client.notification_counts_client.get_all_notification_counts_for_today") as mock:
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
            ([25, 25], {"sms": 25, "email": 25}),  # Falls back to API if either is None
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
        assert result == expected_result

        if None in redis_side_effect:
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

    def test_get_limit_stats(self, mocker):
        # Setup
        mock_service = Mock(id="service-1", email_annual_limit=1000, sms_annual_limit=500, message_limit=100, sms_daily_limit=50)

        mock_notification_client = NotificationCounts()

        # Mock the dependency methods

        mocker.patch.object(
            mock_notification_client, "get_all_notification_counts_for_today", return_value={"email": 20, "sms": 10}
        )
        mocker.patch.object(
            mock_notification_client, "get_all_notification_counts_for_year", return_value={"email": 200, "sms": 100}
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

    @pytest.mark.parametrize(
        "today_counts,year_counts,expected_remaining",
        [
            (
                {"email": 0, "sms": 0},
                {"email": 0, "sms": 0},
                {"email": {"annual": 1000, "daily": 100}, "sms": {"annual": 500, "daily": 50}},
            ),
            (
                {"email": 100, "sms": 50},
                {"email": 1000, "sms": 500},
                {"email": {"annual": 0, "daily": 0}, "sms": {"annual": 0, "daily": 0}},
            ),
            (
                {"email": 50, "sms": 25},
                {"email": 500, "sms": 250},
                {"email": {"annual": 500, "daily": 50}, "sms": {"annual": 250, "daily": 25}},
            ),
        ],
    )
    def test_get_limit_stats_remaining_calculations(self, mocker, today_counts, year_counts, expected_remaining):
        # Setup
        mock_service = Mock(id="service-1", email_annual_limit=1000, sms_annual_limit=500, message_limit=100, sms_daily_limit=50)

        mock_notification_client = NotificationCounts()

        mocker.patch.object(mock_notification_client, "get_all_notification_counts_for_today", return_value=today_counts)
        mocker.patch.object(mock_notification_client, "get_all_notification_counts_for_year", return_value=year_counts)

        # Execute
        result = mock_notification_client.get_limit_stats(mock_service)

        # Assert remaining counts
        assert result["email"]["annual"]["remaining"] == expected_remaining["email"]["annual"]
        assert result["email"]["daily"]["remaining"] == expected_remaining["email"]["daily"]
        assert result["sms"]["annual"]["remaining"] == expected_remaining["sms"]["annual"]
        assert result["sms"]["daily"]["remaining"] == expected_remaining["sms"]["daily"]

    def test_get_limit_stats_dependencies_called(self, mocker):
        # Setup
        mock_service = Mock(id="service-1", email_annual_limit=1000, sms_annual_limit=500, message_limit=100, sms_daily_limit=50)
        mock_notification_client = NotificationCounts()

        mock_today = mocker.patch.object(
            mock_notification_client, "get_all_notification_counts_for_today", return_value={"email": 0, "sms": 0}
        )
        mock_year = mocker.patch.object(
            mock_notification_client, "get_all_notification_counts_for_year", return_value={"email": 0, "sms": 0}
        )

        # Execute
        mock_notification_client.get_limit_stats(mock_service)

        # Assert dependencies called
        mock_today.assert_called_once_with(mock_service.id)
        mock_year.assert_called_once_with(
            mock_service.id,
            get_current_financial_year(),
        )
