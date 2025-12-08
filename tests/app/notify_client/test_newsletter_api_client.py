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


def test_confirm_subscriber(mocker):
    subscriber_id = "test-subscriber-123"
    email = "test@cds-snc.ca"
    mock_get = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.get",
        return_value={"subscriber": {"id": subscriber_id, "email": email}},
    )

    client = NewsletterAPIClient()
    result = client.confirm_subscriber(subscriber_id)

    mock_get.assert_called_once_with(url=f"/newsletter/confirm/{subscriber_id}")
    assert result == {"subscriber": {"id": subscriber_id, "email": email}}


def test_get_subscriber(mocker):
    subscriber_id = "test-subscriber-456"
    email = "test@cds-snc.ca"
    mock_get = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.get",
        return_value={"subscriber": {"id": subscriber_id, "email": email}},
    )

    client = NewsletterAPIClient()
    result = client.get_subscriber(subscriber_id)

    mock_get.assert_called_once_with(url=f"/newsletter/find-subscriber?subscriber_id={subscriber_id}")
    assert result == {"subscriber": {"id": subscriber_id, "email": email}}


def test_unsubscribe_invalidates_cache(mocker):
    """Test that unsubscribe invalidates the subscriber cache"""
    subscriber_id = "test-subscriber-123"
    mock_get = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.get",
        return_value={"subscriber": {"status": "unsubscribed"}},
    )
    mock_redis_delete = mocker.patch("app.notify_client.cache.redis_client.delete")

    client = NewsletterAPIClient()
    client.unsubscribe(subscriber_id)

    # Verify the API was called
    mock_get.assert_called_once_with(url=f"/newsletter/unsubscribe/{subscriber_id}")

    # Verify cache was invalidated with the correct key
    mock_redis_delete.assert_called_once_with(f"subscriber-{subscriber_id}")


def test_confirm_subscriber_invalidates_cache(mocker):
    """Test that confirm_subscriber invalidates the subscriber cache"""
    subscriber_id = "test-subscriber-123"
    mock_get = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.get",
        return_value={"subscriber": {"status": "subscribed"}},
    )
    mock_redis_delete = mocker.patch("app.notify_client.cache.redis_client.delete")

    client = NewsletterAPIClient()
    client.confirm_subscriber(subscriber_id)

    # Verify the API was called
    mock_get.assert_called_once_with(url=f"/newsletter/confirm/{subscriber_id}")

    # Verify cache was invalidated with the correct key
    mock_redis_delete.assert_called_once_with(f"subscriber-{subscriber_id}")


def test_update_language_invalidates_cache(mocker):
    """Test that update_language invalidates the subscriber cache"""
    subscriber_id = "test-subscriber-456"
    language = "fr"
    mock_post = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.post",
        return_value={"subscriber": {"id": subscriber_id, "language": language}},
    )
    mock_redis_delete = mocker.patch("app.notify_client.cache.redis_client.delete")

    client = NewsletterAPIClient()
    client.update_language(subscriber_id, language)

    # Verify the API was called
    mock_post.assert_called_once_with(
        url=f"/newsletter/update-language/{subscriber_id}",
        data={"language": language},
    )

    # Verify cache was invalidated with the correct key
    mock_redis_delete.assert_called_once_with(f"subscriber-{subscriber_id}")
