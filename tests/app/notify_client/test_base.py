import pytest
import requests
from app.notify_client.service_api_client import service_api_client
from notifications_python_client.errors import HTTP503Error


def test_retry_on_server_error_2_failed_tries(app_, mocker):
    response = requests.Response()
    response._content = b'{"foo": "bar"}'
    response.encoding = "utf-8"
    response.status_code = 200

    # 2 failures, 1 good response, successful on last try
    mocker.patch(
        "requests.Session.request",
        side_effect=[
            requests.exceptions.ConnectionError(),
            requests.exceptions.ConnectionError(),
            response,
        ],
    )

    with app_.test_request_context():
        # Mock log_admin_call to avoid accessing current_service from request context
        mocker.patch("app.notify_client.NotifyAdminAPIClient.log_admin_call")
        assert service_api_client.get_live_services_data() == {"foo": "bar"}


def test_retry_on_server_error_3_failed_tries(app_, mocker):
    response = requests.Response()
    response._content = b"{}"
    response.encoding = "utf-8"
    response.status_code = 200

    # 3 failures, 1 good response: too many failures
    mocker.patch(
        "requests.Session.request",
        side_effect=[
            requests.exceptions.ConnectionError(),
            requests.exceptions.ConnectionError(),
            requests.exceptions.ConnectionError(),
            response,
        ],
    )

    with app_.test_request_context():
        # Mock log_admin_call to avoid accessing current_service from request context
        mocker.patch("app.notify_client.NotifyAdminAPIClient.log_admin_call")
        with pytest.raises(HTTP503Error):
            service_api_client.get_live_services_data()
