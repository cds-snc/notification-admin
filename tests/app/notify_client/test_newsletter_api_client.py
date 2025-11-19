from app.notify_client.newsletter_api_client import NewsletterAPIClient


def test_create_unconfirmed_subscriber(mocker):
    mock_post = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.post",
        return_value={"data": {"id": "123", "email": "test@cds-snc.ca", "language": "en"}},
    )

    client = NewsletterAPIClient()
    result = client.create_unconfirmed_subscriber("test@cds-snc.ca", "en")

    mock_post.assert_called_once_with(
        url="/newsletter/unconfirmed-subscriber",
        data={"email": "test@cds-snc.ca", "language": "en"},
    )
    assert result == {"data": {"id": "123", "email": "test@cds-snc.ca", "language": "en"}}


def test_create_unconfirmed_subscriber_french(mocker):
    mock_post = mocker.patch(
        "app.notify_client.newsletter_api_client.NewsletterAPIClient.post",
        return_value={"data": {"id": "456", "email": "test@cds-snc.ca", "language": "fr"}},
    )

    client = NewsletterAPIClient()
    result = client.create_unconfirmed_subscriber("test@cds-snc.ca", "fr")

    mock_post.assert_called_once_with(
        url="/newsletter/unconfirmed-subscriber",
        data={"email": "test@cds-snc.ca", "language": "fr"},
    )
    assert result == {"data": {"id": "456", "email": "test@cds-snc.ca", "language": "fr"}}
