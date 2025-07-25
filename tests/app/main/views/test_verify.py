import json
import uuid

from bs4 import BeautifulSoup
from flask import redirect, url_for
from itsdangerous import SignatureExpired

from tests.conftest import normalize_spaces, set_config


def test_should_return_verify_template(
    client,
    api_user_active,
    mock_send_verify_code,
):
    # TODO this lives here until we work out how to
    # reassign the session after it is lost mid register process
    with client.session_transaction() as session:
        session["user_details"] = {
            "email_address": api_user_active["email_address"],
            "id": api_user_active["id"],
        }
    response = client.get(url_for("main.verify"))
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.text == "Check your phone messages"
    assert "We’ve sent you a text message with a security code." in page.text


def test_should_redirect_to_welcome_screen_when_two_factor_code_is_correct(
    client,
    api_user_active,
    mocker,
    mock_update_user_attribute,
    mock_check_verify_code,
    mock_create_event,
    fake_uuid,
):
    api_user_active["current_session_id"] = str(uuid.UUID(int=1))
    mocker.patch("app.user_api_client.get_user", return_value=api_user_active)

    with client.session_transaction() as session:
        session["user_details"] = {
            "email_address": api_user_active["email_address"],
            "id": api_user_active["id"],
        }
        # user's only just created their account so no session in the cookie
        session.pop("current_session_id", None)

    response = client.post(url_for("main.verify"), data={"two_factor_code": "12345"})
    assert response.status_code == 302
    assert response.location == url_for("main.welcome")

    # make sure the current_session_id has changed to what the API returned
    with client.session_transaction() as session:
        assert session["current_session_id"] == str(uuid.UUID(int=1))

    mock_check_verify_code.assert_called_once_with(api_user_active["id"], "12345", "sms")


def test_should_activate_user_after_verify(
    client,
    mocker,
    api_user_pending,
    mock_send_verify_code,
    mock_check_verify_code,
    mock_create_event,
    mock_activate_user,
):
    mocker.patch("app.user_api_client.get_user", return_value=api_user_pending)
    with client.session_transaction() as session:
        session["user_details"] = {
            "email_address": api_user_pending["email_address"],
            "id": api_user_pending["id"],
        }
    client.post(url_for("main.verify"), data={"two_factor_code": "12345"})
    assert mock_activate_user.called


def test_should_return_200_when_two_factor_code_is_wrong(
    client_request,
    api_user_active,
    mock_check_verify_code_code_not_found,
):
    with client_request.session_transaction() as session:
        session["user_details"] = {
            "email_address": api_user_active["email_address"],
            "id": api_user_active["id"],
        }

    page = client_request.post(
        "main.verify",
        _data={"two_factor_code": "12345"},
        _expected_status=200,
    )

    assert len(page.select(".error-message")) == 1
    assert normalize_spaces(page.select_one(".error-message").text) == ("Try again. Something’s wrong with this code")


# TODO: REMOVE TEST WHEN FF_AUTH_V2 IS REMOVED
def test_verify_email_redirects_to_verify_if_token_valid_REMOVE_FF(
    client,
    mocker,
    api_user_pending,
    mock_get_user_pending,
    mock_send_verify_code,
    mock_check_verify_code,
    app_,
):
    with set_config(app_, "FF_AUTH_V2", False):
        token_data = {"user_id": api_user_pending["id"], "secret_code": "UNUSED"}
        mocker.patch("app.main.views.verify.check_token", return_value=json.dumps(token_data))

        with client.session_transaction() as session:
            session["user_details"] = {
                "email_address": api_user_pending["email_address"],
                "id": api_user_pending["id"],
            }

        response = client.get(url_for("main.verify_email", token="notreal"))

        assert response.status_code == 302
        assert response.location == url_for("main.verify")

        assert not mock_check_verify_code.called
        mock_send_verify_code.assert_called_once_with(api_user_pending["id"], "sms", api_user_pending["mobile_number"])

        with client.session_transaction() as session:
            assert session["user_details"] == {
                "email": api_user_pending["email_address"],
                "id": api_user_pending["id"],
            }


def test_verify_email_redirects_to_verify_if_token_valid(
    client, mocker, api_user_pending, mock_get_user_pending, mock_send_verify_code, mock_check_verify_code, app_
):
    with set_config(app_, "FF_AUTH_V2", True):
        token_data = {"user_id": api_user_pending["id"], "secret_code": "UNUSED"}
        mocker.patch("app.main.views.verify.check_token", return_value=json.dumps(token_data))
        # Mock activate_user to prevent side effects and control flow, returning a redirect
        mock_activate_user = mocker.patch("app.main.views.verify.activate_user", return_value=redirect(url_for("main.verify")))

        with client.session_transaction() as session:
            session["user_details"] = {
                "email_address": api_user_pending["email_address"],
                "id": api_user_pending["id"],
            }

        response = client.get(url_for("main.verify_email", token="notreal"))

        assert response.status_code == 302
        assert response.location == url_for("main.verify")

        assert not mock_check_verify_code.called
        mock_send_verify_code.assert_not_called()

        with client.session_transaction() as session:
            assert session["user_details"] == {
                "email": api_user_pending["email_address"],
                "id": api_user_pending["id"],
            }
        # Ensure activate_user was called
        mock_activate_user.assert_called()


def test_verify_email_redirects_to_email_sent_if_token_expired(
    client,
    mocker,
    api_user_pending,
):
    mocker.patch("app.main.views.verify.check_token", side_effect=SignatureExpired("expired"))

    response = client.get(url_for("main.verify_email", token="notreal"))

    assert response.status_code == 302
    assert response.location == url_for("main.resend_email_verification")


def test_verify_email_redirects_to_sign_in_if_user_active(
    client,
    mocker,
    api_user_active,
    mock_get_user,
    mock_send_verify_code,
    mock_check_verify_code,
):
    token_data = {"user_id": api_user_active["id"], "secret_code": 12345}
    mocker.patch("app.main.views.verify.check_token", return_value=json.dumps(token_data))

    response = client.get(url_for("main.verify_email", token="notreal"), follow_redirects=True)
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.text == "Sign in"
    flash_banner = page.find("div", class_="banner-dangerous").string.strip()
    assert flash_banner == "That verification link has expired."


def test_verify_redirects_to_sign_in_if_not_logged_in(client):
    response = client.get(url_for("main.verify"))

    assert response.location == url_for("main.sign_in")
    assert response.status_code == 302
