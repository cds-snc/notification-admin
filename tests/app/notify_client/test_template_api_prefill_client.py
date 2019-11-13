import uuid

from app.notify_client.template_api_prefill_client import (
    TemplateApiPrefillClient,
)


def test_template_api_prefill_client_calls_correct_api_endpoint_for_service(mocker, api_user_active):

    some_service_id = uuid.uuid4()
    expected_url = '/service/{}/template-statistics'.format(some_service_id)

    client = TemplateApiPrefillClient()

    mock_get = mocker.patch('app.notify_client.template_api_prefill_client.TemplateApiPrefillClient.get')

    client.get_template_api_prefill_client(some_service_id)

    mock_get.assert_called_once_with(url=expected_url, params={})
