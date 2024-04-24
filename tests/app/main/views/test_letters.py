from functools import partial

import pytest
from flask import url_for

letters_urls = [
    partial(url_for, "main.add_service_template", template_type="letter"),
]


@pytest.mark.parametrize("url", letters_urls)
@pytest.mark.parametrize("permissions, response_code", [(["letter"], 200), ([], 403)])
def test_letters_access_restricted(
    platform_admin_client,
    mocker,
    permissions,
    response_code,
    mock_get_service_templates,
    url,
    service_one,
):
    service_one["permissions"] = permissions

    mocker.patch("app.service_api_client.get_service", return_value={"data": service_one})

    response = platform_admin_client.get(url(service_id=service_one["id"]))

    assert response.status_code == response_code


@pytest.mark.parametrize("url", letters_urls)
def test_letters_lets_in_without_permission(
    client,
    mocker,
    mock_login,
    mock_has_permissions,
    api_user_active,
    mock_get_service_templates,
    url,
    service_one,
):
    service_one["permissions"] = ["letter"]
    mocker.patch("app.service_api_client.get_service", return_value={"data": service_one})

    client.login(api_user_active)
    response = client.get(url(service_id=service_one["id"]))

    assert api_user_active["permissions"] == {}
    assert response.status_code == 200
