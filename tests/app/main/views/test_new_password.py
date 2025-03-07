import json
from datetime import datetime
from unittest import mock

import pytest
from flask import url_for
from itsdangerous import SignatureExpired
from notifications_utils.url_safe_token import generate_token

from tests.conftest import url_for_endpoint_with_token


def test_should_render_new_password_template(
    app_,
    client,
    api_user_active,
    mock_login,
    mock_send_verify_code,
    mock_get_user_by_email_request_password_reset,
):
    data = json.dumps(
        {
            "email": api_user_active["email_address"],
            "created_at": str(datetime.utcnow()),
            "password_expired": False,
        }
    )
    token = generate_token(data, app_.config["SECRET_KEY"])

    response = client.get(url_for_endpoint_with_token(".new_password", token=token))
    assert response.status_code == 200
    assert "Your password must have:" in response.get_data(as_text=True)


def test_should_return_404_when_email_address_does_not_exist(
    app_,
    client,
    mock_get_user_by_email_not_found,
):
    data = json.dumps({"email": "no_user@d.canada.ca", "created_at": str(datetime.utcnow())})
    token = generate_token(data, app_.config["SECRET_KEY"])
    response = client.get(url_for_endpoint_with_token(".new_password", token=token))
    assert response.status_code == 404


def test_should_redirect_to_two_factor_when_password_reset_is_successful(
    app_,
    client,
    mock_get_user_by_email_request_password_reset,
    mock_login,
    mock_send_verify_code,
    mock_reset_failed_login_count,
):
    user = mock_get_user_by_email_request_password_reset.return_value
    data = json.dumps({"email": user["email_address"], "created_at": str(datetime.utcnow())})
    token = generate_token(data, app_.config["SECRET_KEY"])
    response = client.post(
        url_for_endpoint_with_token(".new_password", token=token),
        data={"new_password": "a-new_password"},
    )
    assert response.status_code == 302
    assert response.location == url_for(".two_factor_sms_sent")
    mock_get_user_by_email_request_password_reset.assert_called_once_with(user["email_address"])


def test_should_redirect_index_if_user_has_already_changed_password(
    app_,
    client,
    mock_get_user_by_email_user_changed_password,
    mock_login,
    mock_send_verify_code,
    mock_reset_failed_login_count,
):
    user = mock_get_user_by_email_user_changed_password.return_value
    data = json.dumps({"email": user["email_address"], "created_at": str(datetime.utcnow())})
    token = generate_token(data, app_.config["SECRET_KEY"])
    response = client.post(
        url_for_endpoint_with_token(".new_password", token=token),
        data={"new_password": "a-new_password"},
    )
    assert response.status_code == 302
    assert response.location == url_for(".index")
    mock_get_user_by_email_user_changed_password.assert_called_once_with(user["email_address"])


@pytest.mark.parametrize("password_expired", [True, False])
def test_should_redirect_to_forgot_password_with_flash_message_when_token_is_expired(
    password_expired, app_, client, mock_login, mocker, fake_uuid, client_request, api_user_active
):
    sample_user = api_user_active
    sample_user["is_authenticated"] = False
    sample_user["password_expired"] = password_expired
    sample_user["email_address"] = "test@admin.ca"

    mocker.patch(
        "app.user_api_client.get_user_by_email_or_none",
        return_value=sample_user,
    )
    mocker.patch(
        "app.user_api_client.get_user_by_email",
        return_value=sample_user,
    )
    mocker.patch(
        "app.main.views.new_password.check_token",
        side_effect=SignatureExpired("expired"),
    )
    token = generate_token(json.dumps({"email": sample_user["email_address"]}), app_.config["SECRET_KEY"])

    response = client.get(url_for_endpoint_with_token(".new_password", token=token))

    assert response.status_code == 302
    assert response.location == url_for(".forgot_password")
    if password_expired:
        with client_request.session_transaction() as session:
            assert session["reset_email_address"] == sample_user["email_address"]


def test_should_sign_in_when_password_reset_is_successful_for_email_auth(
    app_,
    client,
    mock_get_user,
    mock_get_user_by_email_request_password_reset,
    mock_login,
    mock_send_verify_code,
    mock_reset_failed_login_count,
    mock_update_user_password,
    mock_get_login_events,
):
    user = mock_get_user_by_email_request_password_reset.return_value
    user["auth_type"] = "email_auth"
    data = json.dumps({"email": user["email_address"], "created_at": str(datetime.utcnow())})
    token = generate_token(data, app_.config["SECRET_KEY"])

    response = client.post(
        url_for_endpoint_with_token(".new_password", token=token),
        data={"new_password": "a-new_password"},
    )

    assert response.status_code == 302
    assert response.location == url_for(".show_accounts_or_dashboard")
    assert mock_get_user_by_email_request_password_reset.called
    assert mock_reset_failed_login_count.called

    # the log-in flow makes a couple of calls
    mock_get_user.assert_called_once_with(user["id"])
    mock_update_user_password.assert_called_once_with(user["id"], "a-new_password", {"location": None, "user-agent": mock.ANY})

    assert not mock_send_verify_code.called
