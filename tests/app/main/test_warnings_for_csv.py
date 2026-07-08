from collections import namedtuple

import pytest

from app.utils import get_warnings_for_csv

# A minimal stand-in for ``RecipientCSV`` covering only the attributes consumed
# by ``get_warnings_for_csv``. Keeps these tests independent of the real
# notifications-utils CSV parser.
MockRecipients = namedtuple(
    "MockRecipients",
    [
        "has_duplicate_recipients",
        "count_of_unique_duplicate_recipients",
        "count_of_duplicate_recipient_rows",
        "template_type",
    ],
)


@pytest.mark.parametrize(
    "template_type",
    ["sms", "email"],
)
def test_returns_empty_list_when_no_duplicates(app_, template_type):
    recipients = MockRecipients(
        has_duplicate_recipients=False,
        count_of_unique_duplicate_recipients=0,
        count_of_duplicate_recipient_rows=0,
        template_type=template_type,
    )
    with app_.test_request_context():
        assert get_warnings_for_csv(recipients, template_type) == []


def test_returns_singular_warning_for_one_duplicate_recipient(app_):
    recipients = MockRecipients(
        has_duplicate_recipients=True,
        count_of_unique_duplicate_recipients=1,
        count_of_duplicate_recipient_rows=1,
        template_type="email",
    )
    with app_.test_request_context():
        warnings = get_warnings_for_csv(recipients, "email")
    assert len(warnings) == 1
    assert "1 recipient appears more than once in your list" in warnings[0]


def test_returns_plural_warning_for_multiple_duplicate_recipients(app_):
    recipients = MockRecipients(
        has_duplicate_recipients=True,
        count_of_unique_duplicate_recipients=3,
        count_of_duplicate_recipient_rows=3,
        template_type="email",
    )
    with app_.test_request_context():
        warnings = get_warnings_for_csv(recipients, "email")
    assert len(warnings) == 1
    assert "3 recipients appear more than once in your list" in warnings[0]


def test_includes_row_count_when_it_differs_from_unique_count(app_):
    # one recipient appears 4 times → 1 unique duplicate, 3 duplicate rows
    recipients = MockRecipients(
        has_duplicate_recipients=True,
        count_of_unique_duplicate_recipients=1,
        count_of_duplicate_recipient_rows=3,
        template_type="sms",
    )
    with app_.test_request_context():
        warnings = get_warnings_for_csv(recipients, "sms")
    assert len(warnings) == 2
    assert "1 recipient appears more than once in your list" in warnings[0]
    assert "3 rows are duplicates of an earlier row" in warnings[1]


def test_letter_template_never_warns_about_duplicates(app_):
    # Letters can legitimately share an address (e.g. roommates), so the
    # warning would be misleading and is therefore suppressed.
    recipients = MockRecipients(
        has_duplicate_recipients=True,
        count_of_unique_duplicate_recipients=2,
        count_of_duplicate_recipient_rows=2,
        template_type="letter",
    )
    with app_.test_request_context():
        assert get_warnings_for_csv(recipients, "letter") == []
