import uuid

from app.notify_client.api_key_api_client import ApiKeyApiClient


def test_get_api_key_statistics(mocker, api_user_active):
    api_key_id = uuid.uuid4()
    expected_url = '/api-key/{}/total-sends'.format(api_key_id)
    client = ApiKeyApiClient()

    mock_get = mocker.patch('app.notify_client.api_key_api_client.ApiKeyApiClient.get')

    client.get_api_key_statistics(api_key_id)
    mock_get.assert_called_once_with(url=expected_url)
