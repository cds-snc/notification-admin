import pytest
from bs4 import BeautifulSoup
from flask import url_for


# name
# email_address
# mobile_number
# password
@pytest.mark.parametrize(
    "data, expected_errors",
    [
        ({}, 4),
        ({"name": "abcdefg"}, 3),
        ({"name": "abcdefg", "email_address": "abcdefg@cds-snc.ca"}, 2),
        ({"name": "abcdefg", "email_address": "abcdefg@cds-snc.ca", "mobile_number": "9025555555"}, 1),
        (
            {
                "name": "abcdefg",
                "email_address": "sdfdsfdsfdsf@cds-snc.ca",
                "mobile_number": "9025555555",
                "password": "very_SECURE_p4ssw0rd!",
            },
            0,
        ),
    ],
)
def test_validation_summary(
    client,
    mock_send_verify_code,
    mock_register_user,
    mock_get_user_by_email_not_found,
    mock_get_organisations_with_unusual_domains,
    mock_email_is_not_already_in_use,
    mock_send_verify_email,
    mock_login,
    data,
    expected_errors,
):
    response = client.post(url_for("main.register"), data=data, follow_redirects=True)
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert len(page.select("[data-testid='validation_summary'] li")) == expected_errors
