import pytest
from flask import Response, url_for
from notifications_python_client.errors import HTTPError

import app
from tests.conftest import api_user_active as create_active_user


@pytest.mark.parametrize("password_expired", [True, False])
def test_should_render_forgot_password(password_expired, client, mocker, fake_uuid):

    sample_user = create_active_user(fake_uuid, email_address="test@admin.ca")
    sample_user["is_authenticated"] = False
    sample_user["password_expired"] = password_expired
    mocker.patch(
        "app.user_api_client.get_user_by_email_or_none",
        return_value=sample_user,
    )
    if password_expired:
        with client.session_transaction() as session:
            session["reset_email_address"] = sample_user["email_address"]

    response = client.get(url_for(".forgot_password"))

    assert response.status_code == 200
    if password_expired:
        assert "You need to create a new password" in response.get_data(as_text=True)
    else:
        assert "Forgot your password?" in response.get_data(as_text=True)


@pytest.mark.parametrize("email_address", ["test@user.canada.ca", "someuser@notonsafelist.com"])
def test_should_redirect_to_password_reset_sent_for_valid_email(
    client,
    fake_uuid,
    email_address,
    mocker,
):
    sample_user = create_active_user(fake_uuid, email_address=email_address)
    mocker.patch("app.user_api_client.send_reset_password_url", return_value=None)
    response = client.post(
        url_for(".forgot_password"),
        data={"email_address": sample_user["email_address"]},
    )
    assert response.status_code == 200
    assert "Click the link in the email to reset your password." in response.get_data(as_text=True)
    app.user_api_client.send_reset_password_url.assert_called_once_with(sample_user["email_address"])


def test_should_redirect_to_password_reset_sent_for_missing_email(
    client,
    api_user_active,
    mocker,
):

    mocker.patch(
        "app.user_api_client.send_reset_password_url",
        side_effect=HTTPError(Response(status=404), "Not found"),
    )
    response = client.post(
        url_for(".forgot_password"),
        data={"email_address": api_user_active["email_address"]},
    )
    assert response.status_code == 200
    assert "Click the link in the email to reset your password." in response.get_data(as_text=True)
    app.user_api_client.send_reset_password_url.assert_called_once_with(api_user_active["email_address"])
