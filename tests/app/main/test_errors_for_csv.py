from collections import namedtuple

import pytest

from app.utils import get_errors_for_csv

MockRecipients = namedtuple(
    "MockRecipients",
    ["rows_with_bad_recipients", "rows_with_missing_data", "rows_with_combined_variable_content_too_long", "template_type"],
)


@pytest.mark.parametrize(
    "rows_with_bad_recipients, rows_with_missing_data, rows_with_combined_variable_content_too_long, template_type, expected_errors",
    [
        ([], [], [], "sms", []),
        ({2}, [], [], "sms", ["fix 1 phone number"]),
        ({2, 4, 6}, [], [], "sms", ["fix 3 phone numbers"]),
        ({1}, [], [], "email", ["fix 1 email address"]),
        ({2, 4, 6}, [], [], "email", ["fix 3 email addresses"]),
        ({2}, {3}, [], "sms", ["fix 1 phone number", "enter missing data in 1 row"]),
        (
            {2, 4, 6, 8},
            {3, 6, 9, 12},
            [],
            "sms",
            ["fix 4 phone numbers", "enter missing data in 4 rows"],
        ),
        ([], [], {2, 5, 8}, "sms", ["added custom content exceeds the 612 character limit in 3 rows"]),
    ],
)
def test_get_errors_for_csv(
    app_,
    rows_with_bad_recipients,
    rows_with_missing_data,
    rows_with_combined_variable_content_too_long,
    template_type,
    expected_errors,
):
    with app_.test_request_context():
        assert (
            get_errors_for_csv(
                MockRecipients(
                    rows_with_bad_recipients, rows_with_missing_data, rows_with_combined_variable_content_too_long, template_type
                ),
                template_type,
            )
            == expected_errors
        )
