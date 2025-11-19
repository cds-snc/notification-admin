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
