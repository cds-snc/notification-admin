import pytest
from bs4 import BeautifulSoup

services = [
    {
        "service_id": 1,
        "service_name": "jessie the oak tree",
        "organisation_name": "Forest",
        "consent_to_research": True,
        "contact_name": "Forest fairy",
        "organisation_type": "Ecosystem",
        "contact_email": "forest.fairy@digital.cabinet-office.canada.ca",
        "contact_mobile": "+16132532223",
        "live_date": "Sat, 29 Mar 2014 00:00:00 GMT",
        "sms_volume_intent": 100,
        "email_volume_intent": 50,
        "letter_volume_intent": 20,
        "sms_totals": 300,
        "email_totals": 1200,
        "letter_totals": 0,
        "free_sms_fragment_limit": 100,
    },
]


def test_newsletter_subscription_successful_submission_redirects(client, mocker, mock_calls_out_to_GCA):
    """Test that a valid newsletter subscription redirects to home page with success parameter"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)
    mocker.patch("app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber")

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "user@cds-snc.ca",
            "language": "en",
            "csrf_token": "test_token",
            "from_page": "home",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.location.endswith("/?subscribed=1&email=user@cds-snc.ca#newsletter-section")


def test_newsletter_subscription_missing_email_shows_error(client, mocker, mock_calls_out_to_GCA):
    """Test that submitting without email shows validation error"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    error = page.find("span", {"class": "error-message"})
    assert error is not None
    assert "This cannot be empty" in error.text


def test_newsletter_subscription_non_gov_email_shows_error(client, mocker, mock_calls_out_to_GCA):
    """Test that submitting a non-government email shows validation error"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=False)

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "user@gmail.com",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    error = page.find("span", {"class": "error-message"})
    assert error is not None
    assert "is not on our list of government domains" in error.text


def test_newsletter_subscription_missing_language_shows_error(client, mocker, mock_calls_out_to_GCA):
    """Test that submitting without language selection shows validation error"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "user@cds-snc.ca",
            "language": "",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    error = page.find("span", {"class": "error-message"})
    assert error is not None
    assert "You must select an option to continue" in error.text


def test_newsletter_subscription_preserves_language_context(client, mocker, mock_calls_out_to_GCA):
    """Test that form errors are rendered in the correct language context"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    # The page should still be rendered (not a redirect)
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    # Verify page content is present
    assert page.find("html") is not None


@pytest.mark.parametrize("language", ["en", "fr"])
def test_newsletter_subscription_successful_submission(client, mocker, mock_calls_out_to_GCA, language):
    """Test successful newsletter subscription with both English and French languages"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)

    mock_newsletter_client = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber"
    )

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "test@cds-snc.ca",
            "language": language,
            "from_page": "home",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.location == "/?subscribed=1&email=test@cds-snc.ca#newsletter-section"

    mock_newsletter_client.assert_called_once_with("test@cds-snc.ca", language)


def test_confirm_newsletter_subscriber_redirects_to_subscribed_page(client, mocker):
    """Test that confirming a newsletter subscriber redirects to the subscribed page with email"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mock_confirm = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.confirm_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/confirm", follow_redirects=False)

    assert response.status_code == 302
    assert response.location.endswith(f"/newsletter/{subscriber_id}/subscribed")
    mock_confirm.assert_called_once_with(subscriber_id=subscriber_id)


def test_confirm_newsletter_subscriber_with_special_characters_in_email(client, mocker):
    """Test that confirming a subscriber with special characters in email works correctly"""
    subscriber_id = "test-subscriber-456"
    email = "test+tag@cds-snc.ca"

    mock_confirm = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.confirm_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/confirm", follow_redirects=False)

    assert response.status_code == 302
    mock_confirm.assert_called_once_with(subscriber_id=subscriber_id)


def test_newsletter_subscribed_page_displays_email(client, mocker):
    """Test that the newsletter subscribed page displays correctly with email parameter"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/subscribed")

    assert response.status_code == 200
    # Check that the email is present in the page
    assert email in response.data.decode("utf-8")


def test_newsletter_subscribed_page_without_email(client, mocker):
    """Test that the newsletter subscribed page fetches email from API"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/subscribed")

    assert response.status_code == 200


def test_newsletter_subscribed_page_accepts_post_request(client, mocker):
    """Test that the newsletter subscribed page accepts POST requests"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.post(f"/newsletter/{subscriber_id}/subscribed", data={"language": "en"}, follow_redirects=False)

    assert response.status_code == 200


def test_send_latest_newsletter_calls_api_and_redirects(client, mocker):
    """Test that sending latest newsletter calls the API and redirects with flash message"""
    subscriber_id = "test-subscriber-123"

    mock_send_latest = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.send_latest_newsletter",
        return_value=None,
    )

    response = client.get(f"/newsletter/{subscriber_id}/send-latest", follow_redirects=False)

    assert response.status_code == 302
    mock_send_latest.assert_called_once_with(subscriber_id)
    assert response.location.endswith(f"/newsletter/{subscriber_id}/subscribed")


def test_send_latest_newsletter_without_email_parameter(client, mocker):
    """Test that sending latest newsletter works and fetches email from API"""
    subscriber_id = "test-subscriber-456"
    email = "test@cds-snc.ca"

    mock_send_latest = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.send_latest_newsletter",
        return_value=None,
    )
    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/send-latest", follow_redirects=True)

    assert response.status_code == 200
    mock_send_latest.assert_called_once_with(subscriber_id)


# TODO: uncomment after fixing subscriber_id param issue on send-latest call
# def test_send_latest_newsletter_handles_http_error(client, mocker):
#     """Test that send_latest_newsletter redirects to subscription page on HTTPError"""
#     subscriber_id = "test-subscriber-123"

#     mock_send_latest = mocker.patch(
#         "app.notify_client.newsletter_api_client.newsletter_api_client.send_latest_newsletter",
#         side_effect=HTTPError(response=mocker.Mock(status_code=400, json=lambda: {"error": "Invalid subscriber"})),
#     )

#     response = client.get(f"/newsletter/{subscriber_id}/send-latest", follow_redirects=False)

#     assert response.status_code == 302
#     assert response.location == "/newsletter/subscribe"
#     mock_send_latest.assert_called_once_with(subscriber_id)


def test_newsletter_change_language_get_displays_form(client, mocker):
    """Test that GET request to change language displays the form"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-123"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email, "status": "subscribed"}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/change-language")

    assert response.status_code == 200
    assert email in response.data.decode("utf-8")


def test_newsletter_change_language_post_updates_language(client, mocker):
    """Test that POST request to change language updates the subscriber's language"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-123"
    new_language = "fr"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email, "status": "subscribed"}},
    )
    mock_update_language = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.update_language",
        return_value={"subscriber": {"id": subscriber_id, "language": new_language}},
    )

    response = client.post(
        f"/newsletter/{subscriber_id}/change-language",
        data={"action": "change_language", "language": new_language},
        follow_redirects=False,
    )

    assert response.status_code == 302
    mock_update_language.assert_called_once_with(subscriber_id=subscriber_id, language=new_language)
    assert response.location.endswith(f"/newsletter/{subscriber_id}/change-language")


@pytest.mark.parametrize(
    "language,language_name",
    [
        ("en", "English"),
        ("fr", "French"),
    ],
)
def test_newsletter_change_language_displays_correct_language_name(client, mocker, language, language_name):
    """Test that changing language displays the correct language name in flash message"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-123"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email, "status": "subscribed"}},
    )
    mock_update_language = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.update_language",
        return_value={"subscriber": {"id": subscriber_id, "language": language}},
    )

    response = client.post(
        f"/newsletter/{subscriber_id}/change-language",
        data={"action": "change_language", "language": language},
        follow_redirects=True,
    )

    assert response.status_code == 200
    mock_update_language.assert_called_once_with(subscriber_id=subscriber_id, language=language)


def test_newsletter_change_language_get_with_query_params(client, mocker):
    """Test that GET request fetches email from API"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-456"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email, "status": "subscribed"}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/change-language")

    assert response.status_code == 200
    page_content = response.data.decode("utf-8")
    assert email in page_content


def test_newsletter_change_language_post_with_form_params(client, mocker):
    """Test that POST request fetches email from API"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-789"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email, "status": "subscribed"}},
    )
    mock_update_language = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.update_language",
        return_value={"subscriber": {"id": subscriber_id, "language": "en"}},
    )

    response = client.post(
        f"/newsletter/{subscriber_id}/change-language",
        data={"action": "change_language", "language": "en"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    mock_update_language.assert_called_once_with(subscriber_id=subscriber_id, language="en")


def test_newsletter_unsubscribe_calls_api(client, mocker):
    """Test that unsubscribe route calls the API"""
    subscriber_id = "test-subscriber-123"

    mock_unsubscribe = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.unsubscribe",
        return_value={"subscriber": {"id": subscriber_id, "language": "en", "email": "abc@cds-snc.ca"}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/unsubscribe")

    assert response.status_code == 200
    mock_unsubscribe.assert_called_once_with(subscriber_id)


def test_newsletter_subscription_invalid_email(client, mocker, mock_calls_out_to_GCA):
    """Test newsletter subscription with invalid email format"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.organisations_client.get_domains", return_value=[])

    mock_newsletter_client = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber"
    )

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "invalid-email",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    # API should not be called with invalid email
    mock_newsletter_client.assert_not_called()

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.find("html") is not None


def test_newsletter_subscription_empty_email(client, mocker, mock_calls_out_to_GCA):
    """Test newsletter subscription with empty email"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )

    mock_newsletter_client = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber"
    )

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    # API should not be called with empty email
    mock_newsletter_client.assert_not_called()


def test_newsletter_subscription_missing_language(client, mocker, mock_calls_out_to_GCA):
    """Test newsletter subscription with missing language selection"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)

    mock_newsletter_client = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber"
    )

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "test@cds-snc.ca",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    # API should not be called without language selection
    mock_newsletter_client.assert_not_called()


def test_newsletter_subscription_non_gov_email(client, mocker, mock_calls_out_to_GCA):
    """Test newsletter subscription with non-government email"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=False)

    mock_newsletter_client = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber"
    )

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "test@gmail.com",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    # API should not be called with non-government email
    mock_newsletter_client.assert_not_called()


def test_newsletter_subscription_strips_whitespace(client, mocker, mock_calls_out_to_GCA):
    """Test that email whitespace is stripped before submission"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)

    mock_newsletter_client = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber"
    )

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "  test@cds-snc.ca  ",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302

    # Verify the email was stripped of whitespace
    mock_newsletter_client.assert_called_once_with("test@cds-snc.ca", "en")


def test_newsletter_subscription_get_displays_form(client):
    """Test that GET request to /newsletter/subscribe displays the subscription form"""
    response = client.get("/newsletter/subscribe")

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    # Check for form presence
    form = page.find("form", {"id": "newsletter-subscribe-form"})
    assert form is not None

    # Check for email input
    email_input = page.find("input", {"name": "email"})
    assert email_input is not None

    # Check for language radios
    language_radios = page.find_all("input", {"name": "language"})
    assert len(language_radios) == 2  # English and French

    # Check for submit button
    submit_button = page.find("button", {"type": "submit"})
    assert submit_button is not None


def test_newsletter_subscription_from_standalone_redirects_to_check_email(client, mocker):
    """Test that successful submission from standalone page redirects to check email page"""
    mocker.patch("app.main.validators.is_gov_user", return_value=True)
    mocker.patch("app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber")

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "user@cds-snc.ca",
            "language": "en",
            "from_page": "standalone",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert "/newsletter/check-email?email=user" in response.location
    assert "cds-snc.ca" in response.location


def test_newsletter_subscription_from_home_redirects_to_home(client, mocker, mock_calls_out_to_GCA):
    """Test that successful submission from home page redirects back to home page"""
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    mocker.patch("app.main.validators.is_gov_user", return_value=True)
    mocker.patch("app.notify_client.newsletter_api_client.newsletter_api_client.create_unconfirmed_subscriber")

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "user@cds-snc.ca",
            "language": "en",
            "from_page": "home",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.location.endswith("/?subscribed=1&email=user@cds-snc.ca#newsletter-section")


def test_newsletter_subscription_validation_error_from_standalone_renders_standalone_page(client, mocker):
    """Test that validation error from standalone page re-renders standalone page"""
    mocker.patch("app.main.validators.is_gov_user", return_value=False)

    response = client.post(
        "/newsletter/subscribe",
        data={
            "email": "user@gmail.com",
            "language": "en",
            "from_page": "standalone",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    # Should render the standalone page (not WordPress styled)
    error = page.find("span", {"class": "error-message"})
    assert error is not None
    assert "is not on our list of government domains" in error.text

    # Should still have the form
    form = page.find("form", {"id": "newsletter-subscribe-form"})
    assert form is not None


def test_newsletter_check_email_page_displays_message(client):
    """Test that the check email page displays the correct message"""
    email = "test@cds-snc.ca"
    response = client.get(f"/newsletter/check-email?email={email}")

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    # Check for heading
    heading = page.find("h1")
    assert heading is not None
    assert "Check your email" in heading.text

    # Check that email is displayed
    assert email in response.data.decode("utf-8")


def test_newsletter_check_email_without_email_redirects(client):
    """Test that accessing check email page without email parameter redirects"""
    response = client.get("/newsletter/check-email", follow_redirects=False)

    assert response.status_code == 302
    assert response.location == "/newsletter/subscribe"


def test_unsubscribe_page_has_resubscribe_button(client, mocker):
    """Test that the unsubscribe page contains a resubscribe button"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.unsubscribe",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/unsubscribe")

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    # Check for resubscribe link
    resubscribe_link = page.find("a", href="/newsletter/subscribe")
    assert resubscribe_link is not None
    assert "Resubscribe" in resubscribe_link.text


def test_newsletter_change_language_redirects_if_not_subscribed(client, mocker):
    """Test that change language page redirects to subscription page if user is not subscribed"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.get_subscriber",
        return_value={"subscriber": {"email": email, "status": "unsubscribed"}},
    )

    response = client.get(f"/newsletter/{subscriber_id}/change-language", follow_redirects=False)

    assert response.status_code == 302
    assert response.location == "/newsletter/subscribe"
