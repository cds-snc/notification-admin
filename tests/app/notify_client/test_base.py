import pytest
import requests
from notifications_python_client.errors import HTTP503Error

from app.notify_client.service_api_client import service_api_client


def test_retry_on_server_error_2_failed_tries(mocker):
    response = requests.Response()
    response._content = b'{"foo": "bar"}'
    response.encoding = "utf-8"
    response.status_code = 200

    # 2 failures, 1 good response, successful on last try
    mocker.patch(
        'notifications_python_client.base.requests.request',
        side_effect=[
            requests.exceptions.ConnectionError(),
            requests.exceptions.ConnectionError(),
            response
        ]
    )

    assert service_api_client.get_live_services_data() == {"foo": "bar"}


def test_retry_on_server_error_3_failed_tries(mocker):
    response = requests.Response()
    response._content = b"{}"
    response.encoding = "utf-8"
    response.status_code = 200

    # 3 failures, 1 good response: too many failures
    mocker.patch(
        'notifications_python_client.base.requests.request',
        side_effect=[
            requests.exceptions.ConnectionError(),
            requests.exceptions.ConnectionError(),
            requests.exceptions.ConnectionError(),
            response
        ]
    )

    with pytest.raises(HTTP503Error):
        service_api_client.get_live_services_data()
