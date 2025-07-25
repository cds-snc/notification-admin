import pytest
from bs4 import BeautifulSoup
from flask import url_for

from tests.conftest import SERVICE_ONE_ID


def test_should_render_sms_two_factor_page(
    client,
    api_user_active,
    mock_get_security_keys,
    mock_get_login_events,
    mock_get_user,
):
    # TODO this lives here until we work out how to
    # reassign the session after it is lost mid register process
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.get(url_for("main.two_factor_sms_sent"))
    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.select_one("main p").text.strip() == ("We’ve sent you a text message with a security code.")
    assert page.select_one("label").text.strip("Text message code")
    assert page.select_one("input")["type"] == "text"
    assert page.select_one("input")["autocomplete"] == "one-time-code"
    assert page.select_one("input")["inputmode"] == "numeric"
    assert page.select_one("input")["pattern"] == "[0-9]*"


def test_should_render_email_two_factor_page(
    client,
    api_user_active_email_auth,
    mock_get_security_keys,
    mock_get_login_events,
    mocker,
):
    mocker.patch("app.user_api_client.get_user", return_value=api_user_active_email_auth)

    # TODO this lives here until we work out how to
    # reassign the session after it is lost mid register process
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active_email_auth["id"],
            "email": api_user_active_email_auth["email_address"],
        }
    response = client.get(url_for("main.two_factor_email_sent"))
    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.select_one("main p").text.strip() == ("We’ve sent you an email with a security code.")
    assert page.select_one("label").text.strip("Text message code")
    assert page.select_one("input")["type"] == "text"
    assert page.select_one("input")["autocomplete"] == "one-time-code"
    assert page.select_one("input")["inputmode"] == "numeric"
    assert page.select_one("input")["pattern"] == "[0-9]*"


def test_should_render_email_two_factor_page_for_sms_user_forced_to_login_with_email(
    client,
    api_user_active,
    mock_get_security_keys,
    mock_get_login_events,
    mock_get_user,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.get(url_for("main.two_factor_email_sent", requires_email_login=True))
    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.select_one("main p").text.strip() == (
        "For added security, GC Notify has sent you an email message "
        "with a security code to confirm you still control a valid Government email address."
    )


def test_sms_should_login_user_and_should_redirect_to_next_url(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(
        url_for("main.two_factor_sms_sent", next="/services/{}".format(SERVICE_ONE_ID)),
        data={"two_factor_code": "12345"},
    )
    assert response.status_code == 302
    assert response.location == url_for("main.service_dashboard", service_id=SERVICE_ONE_ID)


@pytest.mark.parametrize("method", ["email", "sms"])
def test_should_login_platform_admin_user_and_redirect_to_your_services(
    client,
    platform_admin_user,
    mocker,
    api_user_active,
    mock_check_verify_code,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
    method,
):
    mocker.patch("app.user_api_client.get_user", return_value=platform_admin_user)
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": platform_admin_user["id"],
            "email": platform_admin_user["email_address"],
        }

    response = client.post(url_for(f"main.two_factor_{method}_sent"), data={"two_factor_code": "12345"})

    assert response.status_code == 302
    assert response.location == url_for("main.choose_account")


def test_email_should_login_user_and_should_redirect_to_next_url(
    client,
    api_user_active_email_auth,
    mock_get_user,
    mock_check_verify_code,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active_email_auth["id"],
            "email": api_user_active_email_auth["email_address"],
        }
    response = client.post(
        url_for("main.two_factor_email_sent", next="/services/{}".format(SERVICE_ONE_ID)),
        data={"two_factor_code": "12345"},
    )
    assert response.status_code == 302
    assert response.location == url_for("main.service_dashboard", service_id=SERVICE_ONE_ID)


def test_sms_should_login_user_and_not_redirect_to_external_url(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_get_services_with_one_service,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(
        url_for("main.two_factor_sms_sent", next="http://www.google.com"),
        data={"two_factor_code": "12345"},
    )
    assert response.status_code == 302
    assert response.location == url_for("main.show_accounts_or_dashboard")


def test_email_should_login_user_and_not_redirect_to_external_url(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_get_services_with_one_service,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(
        url_for("main.two_factor_email_sent", next="http://www.google.com"),
        data={"two_factor_code": "12345"},
    )
    assert response.status_code == 302
    assert response.location == url_for("main.show_accounts_or_dashboard")


def test_sms_two_factor_code_should_login_user_and_redirect_to_show_accounts(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    # sms
    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "12345"})

    assert response.status_code == 302
    assert response.location == url_for("main.show_accounts_or_dashboard")


def test_email_two_factor_code_should_login_user_and_redirect_to_show_accounts(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    # sms
    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "12345"})

    assert response.status_code == 302
    assert response.location == url_for("main.show_accounts_or_dashboard")


def test_should_return_200_with_sms_two_factor_code_error_when_two_factor_code_is_wrong(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code_code_not_found,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "23456"})
    assert response.status_code == 200
    assert "Try again. Something’s wrong with this code" in response.get_data(as_text=True)


def test_should_return_200_with_email_two_factor_code_error_when_two_factor_code_is_wrong(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code_code_not_found,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "23456"})
    assert response.status_code == 200
    assert "Try again. Something’s wrong with this code" in response.get_data(as_text=True)


def test_should_login_user_when_multiple_valid_sms_codes_exist(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_get_services_with_one_service,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "23456"})
    assert response.status_code == 302


def test_should_login_user_when_multiple_valid_email_codes_exist(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_get_services_with_one_service,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "23456"})
    assert response.status_code == 302


def test_sms_two_factor_should_set_password_when_new_password_exists_in_session(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_get_services_with_one_service,
    mock_update_user_password,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
            "password": "changedpassword",
            "loginData": {"location": None},
        }

    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "12345"})
    assert response.status_code == 302
    assert response.location == url_for("main.show_accounts_or_dashboard")

    mock_update_user_password.assert_called_once_with(api_user_active["id"], "changedpassword", {"location": None})


def test_email_two_factor_should_set_password_when_new_password_exists_in_session(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_get_services_with_one_service,
    mock_update_user_password,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
            "password": "changedpassword",
            "loginData": {"location": None},
        }

    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "12345"})
    assert response.status_code == 302
    assert response.location == url_for("main.show_accounts_or_dashboard")

    mock_update_user_password.assert_called_once_with(api_user_active["id"], "changedpassword", {"location": None})


def test_two_factor_returns_error_when_user_is_locked(
    client,
    api_user_locked,
    mock_get_locked_user,
    mock_check_verify_code_code_not_found,
    mock_get_services_with_one_service,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_locked["id"],
            "email": api_user_locked["email_address"],
        }
    # sms
    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "12345"})
    assert response.status_code == 200
    assert "Try again. Something’s wrong with this code" in response.get_data(as_text=True)

    # email
    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "12345"})
    assert response.status_code == 200
    assert "Try again. Something’s wrong with this code" in response.get_data(as_text=True)


def test_sms_two_factor_should_redirect_to_sign_in_if_user_not_in_session(
    client,
    api_user_active,
    mock_get_user,
):
    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "12345"})
    assert response.status_code == 302
    assert response.location == url_for("main.sign_in")


def test_email_two_factor_should_redirect_to_sign_in_if_user_not_in_session(
    client,
    api_user_active_email_auth,
    mock_get_user_email_auth,
):
    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "12345"})
    assert response.status_code == 302
    assert response.location == url_for("main.sign_in")


def test_sms_two_factor_should_activate_pending_user(
    client,
    mocker,
    api_user_pending,
    mock_check_verify_code,
    mock_create_event,
    mock_activate_user,
    mock_get_security_keys,
    mock_get_login_events,
):
    mocker.patch("app.user_api_client.get_user", return_value=api_user_pending)
    mocker.patch("app.service_api_client.get_services", return_value={"data": []})
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_pending["id"],
            "email_address": api_user_pending["email_address"],
        }
    client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "12345"})

    assert mock_activate_user.called


def test_email_two_factor_should_activate_pending_user(
    client,
    mocker,
    api_user_pending,
    mock_check_verify_code,
    mock_create_event,
    mock_activate_user,
    mock_get_security_keys,
    mock_get_login_events,
):
    mocker.patch("app.user_api_client.get_user", return_value=api_user_pending)
    mocker.patch("app.service_api_client.get_services", return_value={"data": []})
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_pending["id"],
            "email_address": api_user_pending["email_address"],
        }
    client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "12345"})

    assert mock_activate_user.called


def test_two_factor_email_link_has_expired(
    client,
    api_user_active_email_auth,
    mock_get_user,
    mock_check_verify_code_code_expired,
    mock_get_security_keys,
    mock_get_login_events,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active_email_auth["id"],
            "email_address": api_user_active_email_auth["email_address"],
        }
    response = client.post(url_for("main.two_factor_email_sent"), data={"two_factor_code": "12345"})

    assert response.status_code == 200

    assert "That security code has expired" in response.get_data(as_text=True)


def test_should_login_user_and_should_render_login_events_page(
    client,
    api_user_active,
    mock_get_user,
    mock_check_verify_code,
    mock_create_event,
    mock_get_security_keys,
    mock_get_login_events_with_data,
):
    with client.session_transaction() as session:
        session["user_details"] = {
            "id": api_user_active["id"],
            "email": api_user_active["email_address"],
        }
    response = client.post(url_for("main.two_factor_sms_sent"), data={"two_factor_code": "12345"})

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.select_one("h1").text.strip() == ("Sign-in history")
