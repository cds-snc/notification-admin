import pytest

from app import format_notification_status, format_notification_status_as_url
from tests.conftest import set_config


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


@pytest.mark.parametrize(
    "template_type, status, feedback_subtype, , expected",
    (
        ("email", "failed", None, "Failed"),
        ("email", "technical-failure", None, "Tech issue"),
        ("email", "temporary-failure", None, "Content or inbox issue"),
        ("email", "virus-scan-failed", None, "Virus in attachment"),
        ("email", "permanent-failure", None, "No such address"),
        ("email", "permanent-failure", "suppressed", "Blocked"),
        ("email", "permanent-failure", "on-account-suppression-list", "Blocked"),
        ("email", "delivered", None, "Delivered"),
        ("email", "sending", None, "In transit"),
        ("email", "created", None, "In transit"),
        ("email", "sent", None, "Delivered"),
        ("email", "pending", None, "In transit"),
        ("email", "pending-virus-check", None, "In transit"),
        ("email", "pii-check-failed", None, "Exceeds Protected A"),
    ),
)
def test_format_notification_status_uses_correct_labels(client, template_type, status, feedback_subtype, expected, app_):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        assert format_notification_status(status, template_type, None, feedback_subtype) == expected
