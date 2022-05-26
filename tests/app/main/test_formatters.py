import pytest

from app import format_notification_status_as_url


@pytest.mark.parametrize(
    "status, notification_type, expected",
    (
        # Successful statuses aren’t linked
        ("created", "email", None),
        ("sending", "email", None),
        ("delivered", "email", None),
        # Failures are linked to the channel-specific page
        (
            "temporary-failure",
            "email",
            "/message-delivery-status#email-statuses",
        ),
        (
            "permanent-failure",
            "email",
            "/message-delivery-status#email-statuses",
        ),
        (
            "technical-failure",
            "email",
            "/message-delivery-status#email-statuses",
        ),
        (
            "temporary-failure",
            "sms",
            "/message-delivery-status#sms-statuses",
        ),
        (
            "permanent-failure",
            "sms",
            "/message-delivery-status#sms-statuses",
        ),
        (
            "technical-failure",
            "sms",
            "/message-delivery-status#sms-statuses",
        ),
        # Letter statuses are never linked
        ("technical-failure", "letter", None),
        ("cancelled", "letter", None),
        ("accepted", "letter", None),
        ("received", "letter", None),
    ),
)
def test_format_notification_status_as_url(
    client,
    status,
    notification_type,
    expected,
):
    assert format_notification_status_as_url(status, notification_type) == expected
