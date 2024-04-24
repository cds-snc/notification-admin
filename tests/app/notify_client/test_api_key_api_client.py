import uuid

from app.notify_client.api_key_api_client import ApiKeyApiClient


def test_get_api_key_statistics(mocker, api_user_active):
    api_key_id = uuid.uuid4()
    expected_url = "/api-key/{}/summary-statistics".format(api_key_id)
    client = ApiKeyApiClient()

    mock_get = mocker.patch("app.notify_client.api_key_api_client.ApiKeyApiClient.get")

    client.get_api_key_statistics(api_key_id)
    mock_get.assert_called_once_with(url=expected_url)


def test_get_api_keys_ranked(mocker, api_user_active):
    n_days_back = 2
    expected_url = "/api-key/ranked-by-notifications-created/{}".format(n_days_back)
    client = ApiKeyApiClient()

    mock_get = mocker.patch("app.notify_client.api_key_api_client.ApiKeyApiClient.get")

    client.get_api_keys_ranked_by_notifications_created(n_days_back)
    mock_get.assert_called_once_with(url=expected_url)
