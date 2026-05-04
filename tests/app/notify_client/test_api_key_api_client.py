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


def test_create_api_key_with_permissions(mocker, api_user_active):
    service_id = uuid.uuid4()
    client = ApiKeyApiClient()

    mock_post = mocker.patch(
        "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
        return_value={"data": {"key": "secret", "key_name": "test_key"}},
    )
    mocker.patch(
        "app.notify_client.api_key_api_client._attach_current_user", side_effect=lambda d: {**d, "created_by": "user-id"}
    )

    client.create_api_key(
        service_id=str(service_id),
        key_name="test key",
        key_type="normal",
        permissions=["manage_templates"],
    )

    mock_post.assert_called_once_with(
        url="/service/{}/api-key".format(service_id),
        data={
            "name": "test key",
            "key_type": "normal",
            "permissions": ["manage_templates"],
            "created_by": "user-id",
        },
    )


def test_create_api_key_without_permissions(mocker, api_user_active):
    service_id = uuid.uuid4()
    client = ApiKeyApiClient()

    mock_post = mocker.patch(
        "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
        return_value={"data": {"key": "secret", "key_name": "test_key"}},
    )
    mocker.patch(
        "app.notify_client.api_key_api_client._attach_current_user", side_effect=lambda d: {**d, "created_by": "user-id"}
    )

    client.create_api_key(
        service_id=str(service_id),
        key_name="test key",
        key_type="normal",
    )

    mock_post.assert_called_once_with(
        url="/service/{}/api-key".format(service_id),
        data={
            "name": "test key",
            "key_type": "normal",
            "created_by": "user-id",
        },
    )
