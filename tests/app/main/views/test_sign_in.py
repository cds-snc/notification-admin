import uuid
from datetime import datetime, timedelta

import pytest
from bs4 import BeautifulSoup
from flask import current_app, url_for

from app.models.user import User
from tests.conftest import api_user_active as create_active_user
from tests.conftest import normalize_spaces


def test_render_sign_in_template_for_new_user(client_request):
    client_request.logout()
    page = client_request.get("main.sign_in")
    assert normalize_spaces(page.select_one("h1").text) == "Sign in"
    assert normalize_spaces(page.select("label")[0].text) == "Email address"
    assert page.select_one("#email_address")["value"] == ""
    assert page.select_one("#email_address")["autocomplete"] == "email"
    assert normalize_spaces(page.select("label")[1].text) == "Password"
    assert page.select_one("#password")["value"] == ""
    assert page.select_one("#password")["autocomplete"] == "current-password"
    assert page.select("main a")[0].text == "create one now"
    assert page.select("main a")[0]["href"] == url_for("main.register")
    assert page.select("main a")[1].text == "Forgot your password?"
    assert page.select("main a")[1]["href"] == url_for("main.forgot_password")
    assert "Sign in again" not in normalize_spaces(page.text)


def test_sign_in_explains_session_timeout(client):
    response = client.get(url_for("main.sign_in", next="/foo"))
    assert response.status_code == 200
    assert "We signed you out because you haven’t used GC Notify for a while." in response.get_data(as_text=True)


def test_sign_in_explains_other_browser(logged_in_client, api_user_active, mocker):
    api_user_active["current_session_id"] = str(uuid.UUID(int=1))
    mocker.patch("app.user_api_client.get_user", return_value=api_user_active)

    with logged_in_client.session_transaction() as session:
        session["current_session_id"] = str(uuid.UUID(int=2))

    response = logged_in_client.get(url_for("main.sign_in", next="/foo"))

    assert_str = "We signed you out because you signed in to GC Notify on another device"

    assert response.status_code == 200
    assert assert_str in response.get_data(as_text=True)


def test_doesnt_redirect_to_sign_in_if_no_session_info(
    client_request,
    api_user_active,
    mock_get_organisation_by_domain,
):
    api_user_active["current_session_id"] = str(uuid.UUID(int=1))

    with client_request.session_transaction() as session:
        session["current_session_id"] = None

    client_request.get("main.add_service")


@pytest.mark.parametrize(
    "db_sess_id, cookie_sess_id",
    [
        pytest.param(None, None, marks=pytest.mark.xfail),  # OK - not used notify since browser signout was implemented
        (
            uuid.UUID(int=1),
            None,
        ),  # BAD - has used other browsers before but this is a brand new browser with no cookie
        (
            uuid.UUID(int=1),
            uuid.UUID(int=2),
        ),  # BAD - this person has just signed in on a different browser
    ],
)
def test_redirect_to_sign_in_if_logged_in_from_other_browser(
    logged_in_client, api_user_active, mocker, db_sess_id, cookie_sess_id
):
    api_user_active["current_session_id"] = db_sess_id
    mocker.patch("app.user_api_client.get_user", return_value=api_user_active)
    with logged_in_client.session_transaction() as session:
        session["current_session_id"] = str(cookie_sess_id)

    response = logged_in_client.get(url_for("main.choose_account"))
    assert response.status_code == 302
    assert response.location == url_for("main.sign_in", next="/accounts", _external=True)


def test_logged_in_user_redirects_to_account(client_request):
    client_request.get(
        "main.sign_in",
        _expected_status=302,
        _expected_redirect=url_for("main.show_accounts_or_dashboard", _external=True),
    )


@pytest.mark.parametrize(
    "email_address, password",
    [
        ("valid@example.canada.ca", "val1dPassw0rd!"),
        (" valid@example.canada.ca  ", "  val1dPassw0rd!  "),
    ],
)
@pytest.mark.parametrize(
    "last_email_login",
    [
        datetime.utcnow() - timedelta(days=5),
        datetime.utcnow() - timedelta(days=29),
        datetime.utcnow() - timedelta(minutes=5),
    ],
)
def test_process_sms_auth_sign_in_return_2fa_template(
    client,
    mocker,
    api_user_active,
    mock_send_verify_code,
    mock_get_user,
    mock_get_user_by_email,
    mock_verify_password,
    mock_get_security_keys,
    email_address,
    password,
    last_email_login,
):
    mocker.patch(
        "app.user_api_client.get_last_email_login_datetime",
        return_value=last_email_login,
    )
    response = client.post(
        url_for("main.sign_in"),
        data={"email_address": email_address, "password": password},
    )
    assert response.status_code == 302
    assert response.location == url_for(".two_factor_sms_sent", _external=True)
    mock_get_security_keys.assert_called_with(api_user_active["id"])
    mock_verify_password.assert_called_with(
        api_user_active["id"],
        password,
        {"location": None, "user-agent": "werkzeug/1.0.1"},
    )
    mock_get_user_by_email.assert_called_with("valid@example.canada.ca")


def test_sign_in_redirects_to_forced_password_reset(
    client,
    mocker,
    fake_uuid,
):

    sample_user = create_active_user(fake_uuid, email_address="test@admin.ca")
    sample_user["is_authenticated"] = False
    sample_user["password_expired"] = True

    mocker.patch(
        "app.user_api_client.get_user_by_email",
        return_value=sample_user,
    )

    response = client.post(url_for("main.sign_in"), data={"email_address": "test@admin.ca", "password": "123_hello_W"})

    assert response.location == url_for(
        "main.forced_password_reset",
        _external=True,
    )


def test_forced_password_reset(
    client,
    mocker,
    fake_uuid,
):

    sample_user = create_active_user(fake_uuid, email_address="test@admin.ca")
    sample_user["is_authenticated"] = False
    sample_user["password_expired"] = True

    with client.session_transaction() as session:
        session["reset_email_address"] = sample_user["email_address"]

    mocker.patch(
        "app.user_api_client.get_user_by_email",
        return_value=sample_user,
    )

    mocked_send_email = mocker.patch("app.user_api_client.send_forced_reset_password_url")
    response = client.get(url_for("main.forced_password_reset"))

    assert "Check your email. We sent you a password reset link" in response.get_data(as_text=True)
    mocked_send_email.assert_called_with(sample_user["email_address"])


@pytest.mark.parametrize(
    "email_address",
    [
        None,
        "no_user@nope.com",
    ],
)
def test_forced_password_reset_with_missing_or_bad_email_address(client, mocker, email_address):
    if email_address:
        with client.session_transaction() as session:
            session["reset_email_address"] = email_address

    mocker.patch(
        "app.user_api_client.get_user_by_email",
        return_value=None,
    )

    mocked_send_email = mocker.patch("app.user_api_client.send_forced_reset_password_url")
    response = client.get(url_for("main.forced_password_reset"))

    assert "Check your email. We sent you a password reset link" in response.get_data(as_text=True)
    assert not mocked_send_email.called


def test_forced_password_reset_password_not_expired(
    client,
    mocker,
    fake_uuid,
):

    sample_user = create_active_user(fake_uuid, email_address="test@admin.ca")
    sample_user["is_authenticated"] = False
    sample_user["password_expired"] = False

    with client.session_transaction() as session:
        session["reset_email_address"] = sample_user["email_address"]

    mocker.patch(
        "app.user_api_client.get_user_by_email",
        return_value=sample_user,
    )

    mocked_send_email = mocker.patch("app.user_api_client.send_forced_reset_password_url")
    response = client.get(url_for("main.forced_password_reset"))

    assert "Check your email. We sent you a password reset link" in response.get_data(as_text=True)
    assert not mocked_send_email.called


@pytest.mark.parametrize(
    "last_email_login",
    [
        None,
        datetime.utcnow() - timedelta(days=35),
        datetime.utcnow() - timedelta(days=31),
    ],
)
def test_process_sms_auth_sign_in_return_email_2fa_template_if_no_recent_login(
    client,
    mocker,
    api_user_active,
    mock_send_verify_code,
    mock_get_user,
    mock_get_user_by_email,
    mock_verify_password,
    mock_get_security_keys,
    mock_register_email_login,
    last_email_login,
):
    mock_last_email_login = mocker.patch(
        "app.user_api_client.get_last_email_login_datetime",
        side_effect=[
            last_email_login,
            last_email_login,
            datetime.utcnow() - timedelta(seconds=10),
            datetime.utcnow() - timedelta(seconds=10),
        ],
    )

    assert api_user_active["auth_type"] == "sms_auth"

    response = client.post(
        url_for("main.sign_in"),
        data={"email_address": "valid@example.canada.ca", "password": "val1dPassw0rd!"},
    )
    assert response.status_code == 302
    assert response.location == url_for(".two_factor_email_sent", requires_email_login=True, _external=True)

    mock_get_security_keys.assert_called_with(api_user_active["id"])
    mock_send_verify_code.assert_called_once_with(api_user_active["id"], "email", None, None)
    mock_verify_password.assert_called_with(
        api_user_active["id"],
        "val1dPassw0rd!",
        {"location": None, "user-agent": "werkzeug/1.0.1"},
    )
    mock_register_email_login.assert_called_with(api_user_active["id"])
    mock_get_user_by_email.assert_called_with("valid@example.canada.ca")
    assert mock_last_email_login.call_count == 4


def test_process_email_auth_sign_in_return_2fa_template(
    client,
    api_user_active_email_auth,
    mock_send_verify_code,
    mock_verify_password,
    mock_get_security_keys,
    mock_register_email_login,
    mocker,
):
    mocker.patch("app.user_api_client.get_user", return_value=api_user_active_email_auth)
    mocker.patch("app.user_api_client.get_user_by_email", return_value=api_user_active_email_auth)

    response = client.post(
        url_for("main.sign_in"),
        data={"email_address": "valid@example.canada.ca", "password": "val1dPassw0rd!"},
    )
    assert response.status_code == 302
    assert response.location == url_for(".two_factor_email_sent", _external=True)
    mock_register_email_login.assert_called_with(api_user_active_email_auth["id"])
    mock_send_verify_code.assert_called_with(api_user_active_email_auth["id"], "email", None, None)
    mock_verify_password.assert_called_with(
        api_user_active_email_auth["id"],
        "val1dPassw0rd!",
        {"location": None, "user-agent": "werkzeug/1.0.1"},
    )


def test_should_return_locked_out_true_when_user_is_locked(
    client,
    mock_get_user_by_email_locked,
):
    resp = client.post(
        url_for("main.sign_in"),
        data={
            "email_address": "valid@example.canada.ca",
            "password": "whatIsMyPassword!",
        },
    )
    assert resp.status_code == 200
    assert "The email address or password you entered is incorrect" in resp.get_data(as_text=True)


def test_should_return_200_when_user_does_not_exist(
    client,
    mock_get_user_by_email_not_found,
):
    response = client.post(
        url_for("main.sign_in"),
        data={"email_address": "notfound@canada.ca", "password": "doesNotExist!"},
    )
    assert response.status_code == 200
    assert "The email address or password you entered is incorrect" in response.get_data(as_text=True)


def test_should_return_redirect_when_user_is_pending(
    client,
    mock_get_user_by_email_pending,
    mock_verify_password,
):
    response = client.post(
        url_for("main.sign_in"),
        data={
            "email_address": "pending_user@example.canada.ca",
            "password": "val1dPassw0rd!",
        },
        follow_redirects=True,
    )

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.string == "Sign in"
    assert response.status_code == 200


def test_should_attempt_redirect_when_user_is_pending(
    client,
    mock_get_user_by_email_pending,
    mock_verify_password,
):
    response = client.post(
        url_for("main.sign_in"),
        data={
            "email_address": "pending_user@example.canada.ca",
            "password": "val1dPassw0rd!",
        },
    )
    assert response.location == url_for("main.resend_email_verification", _external=True)
    assert response.status_code == 302


def test_email_address_is_treated_case_insensitively_when_signing_in_as_invited_user(
    client,
    mocker,
    mock_verify_password,
    api_user_active,
    sample_invite,
    mock_accept_invite,
    mock_send_verify_code,
    mock_get_security_keys,
):
    sample_invite["email_address"] = "TEST@user.canada.ca"

    mocker.patch("app.user_api_client.get_user_by_email_or_none", return_value=None)

    mocker.patch(
        "app.models.user.User.from_email_address_and_password_or_none",
        return_value=User(api_user_active),
    )

    with client.session_transaction() as session:
        session["invited_user"] = sample_invite

    response = client.post(
        url_for("main.sign_in"),
        data={"email_address": "test@user.canada.ca", "password": "val1dPassw0rd!"},
    )

    assert mock_accept_invite.called
    assert response.status_code == 302
    assert mock_send_verify_code.called


def test_sign_in_security_center_notification_for_non_NA_signins(
    client,
    api_user_active_email_auth,
    mock_send_verify_code,
    mock_verify_password,
    mock_get_security_keys,
    mocker,
    monkeypatch,
):
    monkeypatch.setitem(current_app.config, "IP_GEOLOCATE_SERVICE", "https://example.com/")

    mocker.patch("app.user_api_client.get_user", return_value=api_user_active_email_auth)
    mocker.patch("app.user_api_client.get_user_by_email", return_value=api_user_active_email_auth)

    reporter = mocker.patch("app.utils.report_security_finding")

    mocker.patch(
        "app.utils._geolocate_lookup",
        return_value={"continent": {"code": "EU"}, "city": None, "subdivision": None},
    )

    response = client.post(
        url_for("main.sign_in"),
        data={"email_address": "valid@example.canada.ca", "password": "val1dPassw0rd!"},
    )
    assert response.status_code == 302

    reporter.assert_called()


def test_sign_in_geolookup_disabled_in_dev(
    client,
    api_user_active_email_auth,
    mock_send_verify_code,
    mock_verify_password,
    mock_get_security_keys,
    mocker,
):
    assert current_app.config["IP_GEOLOCATE_SERVICE"] == ""

    mocker.patch("app.user_api_client.get_user", return_value=api_user_active_email_auth)
    mocker.patch("app.user_api_client.get_user_by_email", return_value=api_user_active_email_auth)

    geolookup_mock = mocker.patch("app.utils._geolocate_lookup")

    response = client.post(
        url_for("main.sign_in"),
        data={
            "email_address": "valid@example.canada.ca",
            "password": "val1dPassw0rd!",
        },
    )
    assert response.status_code == 302

    assert not geolookup_mock.called
