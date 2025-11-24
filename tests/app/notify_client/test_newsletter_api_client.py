import pytest

from app.notify_client.newsletter_api_client import NewsletterAPIClient


@pytest.mark.parametrize(
    "language,subscriber_id",
    [
        ("en", "123"),
        ("fr", "456"),
    ],
)
def test_create_unconfirmed_subscriber(mocker, language, subscriber_id):
    mock_post = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.post",
        return_value={"data": {"id": subscriber_id}},
    )

    client = NewsletterAPIClient()
    result = client.create_unconfirmed_subscriber("test@cds-snc.ca", language)

    mock_post.assert_called_once_with(
        url="/newsletter/unconfirmed-subscriber",
        data={"email": "test@cds-snc.ca", "language": language},
    )
    assert result == {"data": {"id": subscriber_id}}


def test_unsubscribe(mocker):
    subscriber_id = "test-subscriber-123"
    mock_get = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.get",
        return_value={"status": "unsubscribed"},
    )

    client = NewsletterAPIClient()
    result = client.unsubscribe(subscriber_id)

    mock_get.assert_called_once_with(url=f"/newsletter/unsubscribe/{subscriber_id}")
    assert result == {"status": "unsubscribed"}


@pytest.mark.parametrize(
    "language",
    [
        "en",
        "fr",
    ],
)
def test_update_language(mocker, language):
    subscriber_id = "test-subscriber-456"
    mock_post = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.post",
        return_value={"subscriber": {"id": subscriber_id, "language": language}},
    )

    client = NewsletterAPIClient()
    result = client.update_language(subscriber_id, language)

    mock_post.assert_called_once_with(
        url=f"/newsletter/update-language/{subscriber_id}",
        data={"language": language},
    )
    assert result == {"subscriber": {"id": subscriber_id, "language": language}}


def test_send_latest_newsletter(mocker):
    subscriber_id = "test-subscriber-789"

    client = NewsletterAPIClient()
    result = client.send_latest_newsletter(subscriber_id)

    # Currently this method returns None as it's not fully implemented
    assert result is None
