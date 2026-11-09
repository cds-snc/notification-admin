import uuid

from app.notify_client.template_statistics_api_client import TemplateStatisticsApiClient


def test_template_statistics_client_calls_correct_api_endpoint_for_service(mocker, api_user_active):
    some_service_id = uuid.uuid4()
    expected_url = "/service/{}/template-statistics".format(some_service_id)

    client = TemplateStatisticsApiClient()

    mock_get = mocker.patch("app.notify_client.template_statistics_api_client.TemplateStatisticsApiClient.get")

    client.get_template_statistics_for_service(some_service_id)

    mock_get.assert_called_once_with(url=expected_url, params={})


def test_template_statistics_client_calls_correct_api_endpoint_for_template(mocker, api_user_active):
    some_service_id = uuid.uuid4()
    some_template_id = uuid.uuid4()
    expected_url = "/service/{}/template-statistics/{}".format(some_service_id, some_template_id)

    client = TemplateStatisticsApiClient()
    mock_get = mocker.patch("app.notify_client.template_statistics_api_client.TemplateStatisticsApiClient.get")

    client.get_template_statistics_for_template(some_service_id, some_template_id)

    mock_get.assert_called_once_with(url=expected_url)


def test_template_statistics_client_monthly_without_pagination(mocker, api_user_active):
    some_service_id = uuid.uuid4()
    expected_url = "/service/{}/notifications/templates_usage/monthly".format(some_service_id)

    client = TemplateStatisticsApiClient()
    mock_get = mocker.patch("app.notify_client.template_statistics_api_client.TemplateStatisticsApiClient.get")

    client.get_monthly_template_usage_for_service(some_service_id, year=2024)

    mock_get.assert_called_once_with(url=expected_url, params={"year": 2024})


def test_template_statistics_client_monthly_with_pagination(mocker, api_user_active):
    some_service_id = uuid.uuid4()
    expected_url = "/service/{}/notifications/templates_usage/monthly".format(some_service_id)

    client = TemplateStatisticsApiClient()
    mock_get = mocker.patch("app.notify_client.template_statistics_api_client.TemplateStatisticsApiClient.get")

    client.get_monthly_template_usage_for_service(some_service_id, year=2024, page=2, page_size=25)

    mock_get.assert_called_once_with(url=expected_url, params={"year": 2024, "page": 2, "page_size": 25})
