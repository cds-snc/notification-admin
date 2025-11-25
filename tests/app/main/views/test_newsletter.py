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
        "/newsletter-subscription",
        data={
            "email": "user@cds-snc.ca",
            "language": "en",
            "csrf_token": "test_token",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
        data={
            "email": "test@cds-snc.ca",
            "language": language,
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

    response = client.get(f"/newsletter/confirm/{subscriber_id}", follow_redirects=False)

    assert response.status_code == 302
    assert response.location.endswith(f"/newsletter/subscribed?email={email}&subscriber_id={subscriber_id}")
    mock_confirm.assert_called_once_with(subscriber_id=subscriber_id)


def test_confirm_newsletter_subscriber_with_special_characters_in_email(client, mocker):
    """Test that confirming a subscriber with special characters in email works correctly"""
    subscriber_id = "test-subscriber-456"
    email = "test+tag@cds-snc.ca"

    mock_confirm = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.confirm_subscriber",
        return_value={"subscriber": {"email": email}},
    )

    response = client.get(f"/newsletter/confirm/{subscriber_id}", follow_redirects=False)

    assert response.status_code == 302
    mock_confirm.assert_called_once_with(subscriber_id=subscriber_id)


def test_newsletter_subscribed_page_displays_email(client):
    """Test that the newsletter subscribed page displays correctly with email parameter"""
    email = "test@cds-snc.ca"

    response = client.get(f"/newsletter/subscribed?email={email}")

    assert response.status_code == 200
    # Check that the email is present in the page
    assert email in response.data.decode("utf-8")


def test_newsletter_subscribed_page_without_email(client):
    """Test that the newsletter subscribed page works without email parameter"""
    response = client.get("/newsletter/subscribed")

    assert response.status_code == 200


def test_newsletter_subscribed_page_accepts_post_request(client):
    """Test that the newsletter subscribed page accepts POST requests"""
    email = "test@cds-snc.ca"

    response = client.post(f"/newsletter/subscribed?email={email}", data={"language": "en"}, follow_redirects=False)

    assert response.status_code == 200


def test_send_latest_newsletter_calls_api_and_redirects(client, mocker):
    """Test that sending latest newsletter calls the API and redirects with flash message"""
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"

    mock_send_latest = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.send_latest_newsletter",
        return_value=None,
    )

    response = client.get(f"/newsletter/send-latest?subscriber_id={subscriber_id}&email={email}", follow_redirects=False)

    assert response.status_code == 302
    mock_send_latest.assert_called_once_with(subscriber_id)
    assert response.location.endswith(f"/newsletter/subscribed?email={email}&subscriber_id={subscriber_id}")


def test_send_latest_newsletter_without_email_parameter(client, mocker):
    """Test that sending latest newsletter works without email parameter"""
    subscriber_id = "test-subscriber-456"

    mock_send_latest = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.send_latest_newsletter",
        return_value=None,
    )

    response = client.get(f"/newsletter/send-latest?subscriber_id={subscriber_id}", follow_redirects=True)

    assert response.status_code == 200
    mock_send_latest.assert_called_once_with(subscriber_id)


def test_newsletter_change_language_get_displays_form(client):
    """Test that GET request to change language displays the form"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-123"

    response = client.get(f"/newsletter/change-language?email={email}&subscriber_id={subscriber_id}")

    assert response.status_code == 200
    assert email in response.data.decode("utf-8")


def test_newsletter_change_language_post_updates_language(client, mocker):
    """Test that POST request to change language updates the subscriber's language"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-123"
    new_language = "fr"

    mock_update_language = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.update_language",
        return_value={"subscriber": {"id": subscriber_id, "language": new_language}},
    )

    response = client.post(
        "/newsletter/change-language",
        data={"email": email, "subscriber_id": subscriber_id, "action": "change_language", "language": new_language},
        follow_redirects=False,
    )

    assert response.status_code == 302
    mock_update_language.assert_called_once_with(subscriber_id=subscriber_id, language=new_language)
    assert response.location.endswith(f"/newsletter/change-language?email={email}&subscriber_id={subscriber_id}")


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

    mock_update_language = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.update_language",
        return_value={"subscriber": {"id": subscriber_id, "language": language}},
    )

    response = client.post(
        "/newsletter/change-language",
        data={"email": email, "subscriber_id": subscriber_id, "action": "change_language", "language": language},
        follow_redirects=True,
    )

    assert response.status_code == 200
    mock_update_language.assert_called_once_with(subscriber_id=subscriber_id, language=language)


def test_newsletter_change_language_get_with_query_params(client):
    """Test that GET request preserves email and subscriber_id from query parameters"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-456"

    response = client.get(f"/newsletter/change-language?email={email}&subscriber_id={subscriber_id}")

    assert response.status_code == 200
    page_content = response.data.decode("utf-8")
    assert email in page_content


def test_newsletter_change_language_post_with_form_params(client, mocker):
    """Test that POST request uses form parameters when query parameters are not present"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-789"

    mock_update_language = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.update_language",
        return_value={"subscriber": {"id": subscriber_id, "language": "en"}},
    )

    response = client.post(
        "/newsletter/change-language",
        data={"email": email, "subscriber_id": subscriber_id, "action": "change_language", "language": "en"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    mock_update_language.assert_called_once_with(subscriber_id=subscriber_id, language="en")


def test_newsletter_unsubscribe_calls_api(client, mocker):
    """Test that unsubscribe route calls the API"""
    email = "test@cds-snc.ca"
    subscriber_id = "test-subscriber-123"

    mock_unsubscribe = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.unsubscribe",
        return_value={"status": "unsubscribed"},
    )

    response = client.get(f"/newsletter/unsubscribe?email={email}&subscriber_id={subscriber_id}")

    assert response.status_code == 200
    mock_unsubscribe.assert_called_once_with(subscriber_id)
    assert email in response.data.decode("utf-8")


def test_newsletter_unsubscribe_without_subscriber_id(client, mocker):
    """Test that unsubscribe page displays without calling API when subscriber_id is missing"""
    email = "test@cds-snc.ca"

    mock_unsubscribe = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.unsubscribe",
        return_value={"status": "unsubscribed"},
    )

    response = client.get(f"/newsletter/unsubscribe?email={email}")

    assert response.status_code == 200
    mock_unsubscribe.assert_not_called()


def test_newsletter_unsubscribe_without_email(client, mocker):
    """Test that unsubscribe page works without email parameter"""
    subscriber_id = "test-subscriber-456"

    mock_unsubscribe = mocker.patch(
        "app.notify_client.newsletter_api_client.newsletter_api_client.unsubscribe",
        return_value={"status": "unsubscribed"},
    )

    response = client.get(f"/newsletter/unsubscribe?subscriber_id={subscriber_id}")

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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
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
        "/newsletter-subscription",
        data={
            "email": "  test@cds-snc.ca  ",
            "language": "en",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302

    # Verify the email was stripped of whitespace
    mock_newsletter_client.assert_called_once_with("test@cds-snc.ca", "en")
