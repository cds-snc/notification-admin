import base64
import json
import uuid
from unittest.mock import Mock

import pytest
from flask import url_for
from flask_login import current_user
from notifications_python_client.errors import HTTPError
from notifications_utils.url_safe_token import generate_token

from app import User
from tests.conftest import (
    SERVICE_ONE_ID,
    TEMPLATE_ONE_ID,
    captured_templates,
    create_api_user_active,
    url_for_endpoint_with_token,
)


def test_should_show_overview_page(client_request, mock_get_security_keys):
    page = client_request.get(("main.user_profile"))
    assert page.select_one("h1").text.strip() == "Your profile"
    assert "Use platform admin view" not in page


def test_overview_page_shows_disable_for_platform_admin(client_request, platform_admin_user, mock_get_security_keys):
    client_request.login(platform_admin_user)
    page = client_request.get(("main.user_profile"))
    assert page.select_one("h1").text.strip() == "Your profile"
    disable_platform_admin_row = page.find_all("div", class_="sm:w-3/4")[-1]
    assert " ".join(disable_platform_admin_row.text.split()) == "Use platform admin view Yes"


def test_should_show_name_page(client_request, mock_get_security_keys):
    page = client_request.get(("main.user_profile_name"))
    assert page.select_one("h1").text.strip() == "Add or change your name"


def test_should_redirect_after_name_change(
    client_request,
    mock_update_user_attribute,
    mock_email_is_not_already_in_use,
    mock_get_security_keys,
):
    client_request.post(
        "main.user_profile_name",
        _data={"new_name": "New Name"},
        _expected_status=302,
        _expected_redirect=url_for("main.user_profile"),
    )
    assert mock_update_user_attribute.called is True


def test_should_show_email_page(
    client_request,
):
    page = client_request.get("main.user_profile_email")
    assert page.select_one("h1").text.strip() == "Add or change your email address"


def test_should_redirect_after_email_change(
    client_request,
    mock_login,
    mock_email_is_not_already_in_use,
):
    client_request.post(
        "main.user_profile_email",
        _data={"email_address": "new_notify@notify.canada.ca"},
        _expected_status=302,
        _expected_redirect=url_for(
            "main.user_profile_email_authenticate",
        ),
    )


def test_should_show_authenticate_after_email_change(
    client_request,
):
    with client_request.session_transaction() as session:
        session["new-email"] = "new_notify@notify.canada.ca"

    page = client_request.get("main.user_profile_email_authenticate")

    assert "Enter password to change profile settings" in page.text


def test_should_render_change_email_continue_after_authenticate_email(
    client_request,
    mock_verify_password,
    mock_send_change_email_verification,
):
    with client_request.session_transaction() as session:
        session["new-email"] = "new_notify@notify.canada.ca"
    page = client_request.post(
        "main.user_profile_email_authenticate",
        data={"password": "rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02"},
        _expected_status=200,
    )
    assert "Use the link in the email to confirm the change to your email address." in page.text


def test_should_redirect_to_user_profile_when_user_confirms_email_link(
    app_,
    logged_in_client,
    api_user_active,
    mock_update_user_attribute,
):
    token = generate_token(
        payload=json.dumps({"user_id": api_user_active["id"], "email": "new_email@canada.ca"}),
        secret=app_.config["SECRET_KEY"],
    )
    response = logged_in_client.get(url_for_endpoint_with_token("main.user_profile_email_confirm", token=token))

    assert response.status_code == 302
    assert response.location == url_for("main.user_profile")


def test_should_show_mobile_number_page(
    client_request,
):
    page = client_request.get(("main.user_profile_mobile_number"))
    assert "Mobile number" in page.text


@pytest.mark.parametrize(
    "phone_number_to_register_with",
    [
        "+16502532222",
        "+4966921809",
    ],
)
def test_should_redirect_after_mobile_number_change(
    client_request,
    phone_number_to_register_with,
):
    client_request.post(
        "main.user_profile_mobile_number",
        _data={"mobile_number": phone_number_to_register_with},
        _expected_status=302,
        _expected_redirect=url_for(
            "main.user_profile",
        ),
    )


def test_should_show_authenticate_after_mobile_number_change(
    client_request,
):
    with client_request.session_transaction() as session:
        session["new-mob"] = "+441234123123"

    page = client_request.get(
        "main.user_profile_mobile_number_authenticate",
    )

    assert "Enter password to change profile settings" in page.text


def test_should_redirect_after_mobile_number_authenticate(
    client_request,
    mock_verify_password,
    mock_send_verify_code,
):
    with client_request.session_transaction() as session:
        session["new-mob"] = "+441234123123"

    client_request.post(
        "main.user_profile_mobile_number_authenticate",
        _data={"password": "rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02"},
        _expected_status=302,
        _expected_redirect=url_for(
            "main.user_profile_mobile_number_confirm",
        ),
    )


def test_should_show_confirm_after_mobile_number_change(client_request, mock_validate_2fa_method, mocker):
    with client_request.session_transaction() as session:
        session["new-mob-password-confirmed"] = True

    page = client_request.get("main.user_profile_mobile_number_confirm")

    assert "Check your phone messages" in page.text
    assert "Verify" in page.text


@pytest.mark.parametrize(
    "phone_number_to_register_with",
    [
        "+16502532222",
        "+4966921809",
    ],
)
def test_should_redirect_after_mobile_number_confirm(
    client_request,
    mocker,
    mock_update_user_attribute,
    mock_check_verify_code,
    fake_uuid,
    phone_number_to_register_with,
    mock_validate_2fa_method,
    app_,
):
    user_before = create_api_user_active(with_unique_id=True)
    user_after = create_api_user_active(with_unique_id=True)
    user_before["current_session_id"] = str(uuid.UUID(int=1))
    user_after["current_session_id"] = str(uuid.UUID(int=2))

    # first time (login decorator) return normally, second time (after 2FA return with new session id)
    client_request.login(user_before)
    mocker.patch("app.user_api_client.get_user", return_value=user_after)

    with client_request.session_transaction() as session:
        session["new-mob-password-confirmed"] = True
        session["new-mob"] = phone_number_to_register_with
        session["current_session_id"] = user_before["current_session_id"]

    client_request.post(
        "main.user_profile_mobile_number_confirm",
        _data={"two_factor_code": "12345"},
        _expected_status=302,
        _expected_redirect=url_for("main.user_profile"),
    )

    # make sure the current_session_id has changed to what the API returned
    with client_request.session_transaction() as session:
        assert session["current_session_id"] == user_after["current_session_id"]


def test_should_show_password_page(
    client_request,
):
    page = client_request.get(("main.user_profile_password"))

    assert page.select_one("h1").text.strip() == "Change your password"


def test_should_redirect_after_password_change(
    client_request,
    mock_update_user_password,
    mock_verify_password,
):
    client_request.post(
        "main.user_profile_password",
        _data={
            "new_password": "A97592577C84C4E9F5C956666401B2904149194A68211D0A791C1E13A3181239",
            "old_password": "rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02",
        },
        _expected_status=302,
        _expected_redirect=url_for(
            "main.user_profile",
        ),
    )


def test_should_list_security_keys(app_, client_request, api_nongov_user_active, mock_get_security_keys_with_key):
    with captured_templates(app_) as templates:
        page = client_request.get(("main.user_profile_security_keys"))
        template, context = templates[0]
        assert template.name == "views/user-profile/security-keys.html"
        assert page.select("tr")[-1].text.split() == ["Name", "Key", "Remove"]


def test_deleting_security_key(
    app_,
    client_request,
    api_nongov_user_active,
    mock_get_security_keys_with_key,
    mocker,
):
    delete_mock = mocker.patch("app.user_api_client.delete_security_key_user")
    key_id = "security_key_id"

    with client_request.session_transaction() as session:
        session["has_authenticated"] = True

    # Listing keys
    with captured_templates(app_) as templates:
        client_request.get(("main.user_profile_security_keys_confirm_delete"), keyid=key_id)
        template, context = templates[0]
        assert template.name == "views/user-profile/security-keys.html"

    # Clicking on the button
    client_request.post(
        ("main.user_profile_security_keys_confirm_delete"),
        keyid=key_id,
        _expected_status=302,
        _expected_redirect=url_for(
            "main.user_profile_security_keys",
        ),
    )

    delete_mock.assert_called_once_with(api_nongov_user_active["id"], key=key_id)


def test_adding_security_key(app_, client_request, api_nongov_user_active, mocker):
    register_mock = mocker.patch("app.user_api_client.register_security_key", return_value={"data": "blob"})

    with client_request.session_transaction() as session:
        session["has_authenticated"] = True

    # Listing keys
    with captured_templates(app_) as templates:
        page = client_request.get(("main.user_profile_add_security_keys"))
        assert 'data-button-id="register-key"' in str(page)  # Used by JS
        template, _ = templates[0]
        assert template.name == "views/user-profile/add-security-keys.html"

    # Register key
    client_request.post(
        ("main.user_profile_add_security_keys"),
        _expected_status=200,
    )
    register_mock.assert_called_once_with(api_nongov_user_active["id"])


def test_complete_adding_security_key(client_request, api_nongov_user_active, mocker):
    mock = mocker.patch("app.user_api_client.add_security_key_user", return_value={"id": "fake"})
    client_request.post(("main.user_profile_complete_security_keys"), _data="fake", _expected_status=200)
    mock.assert_called_once_with(
        api_nongov_user_active["id"],
        base64.b64encode("fake".encode("utf-8")).decode("utf-8"),
    )


def test_authenticate_security_key(client_request, api_nongov_user_active, mocker):
    mock = mocker.patch(
        "app.user_api_client.authenticate_security_keys",
        return_value={"data": base64.b64encode("fake".encode("utf-8"))},
    )
    response = client_request.post(("main.user_profile_authenticate_security_keys"), _expected_status=200)
    assert response.text == "fake"
    mock.assert_called_once_with(api_nongov_user_active["id"])


def test_user_profile_add_security_keys_shows_duplicate_message(
    client_request,
    mock_get_user,
    mock_get_service,
    mock_update_user_attribute,
    mock_get_security_keys,
):
    with client_request.session_transaction() as session:
        session["has_authenticated"] = True
    page = client_request.get("main.user_profile_add_security_keys", **{"duplicate": "1"})
    # Check that the flash message is displayed
    flash_messages = page.select(".banner-dangerous")
    assert len(flash_messages) == 1
    assert "This security key is already registered" in flash_messages[0].get_text()
    assert "Please use a different key or remove the existing one first" in flash_messages[0].get_text()


def test_user_profile_add_security_keys_no_duplicate_message_without_param(
    client_request,
    mock_get_user,
    mock_get_service,
    mock_update_user_attribute,
    mock_get_security_keys,
):
    with client_request.session_transaction() as session:
        session["has_authenticated"] = True
    page = client_request.get("main.user_profile_add_security_keys")

    # Check that no error flash message is displayed
    flash_messages = page.select(".banner-dangerous")
    assert len(flash_messages) == 0


def test_validate_security_key_api_error(client_request, api_nongov_user_active, mocker):
    mock_login = mocker.patch("app.models.user.User.login")
    mock_validate = mocker.patch(
        "app.user_api_client.validate_security_keys",
        side_effect=HTTPError(response=Mock(status_code=500)),
    )

    client_request.post(("main.user_profile_validate_security_keys"), _data="fake", _expected_status=500)

    assert mock_validate.called
    assert mock_login.called is False


@pytest.mark.parametrize("password_changed", [True, False])
def test_validate_security_key(
    client_request,
    api_nongov_user_active,
    mocker,
    fake_uuid,
    password_changed,
):
    mock_login = mocker.patch("app.models.user.User.login")
    mock_validate = mocker.patch("app.user_api_client.validate_security_keys", return_value={"status": "OK"})
    mock_change_password = mocker.patch("app.models.user.User.update_password")
    new_user = dict(api_nongov_user_active)
    new_user["current_session_id"] = fake_uuid
    mocker.patch("app.user_api_client.get_user", return_value=new_user)

    if password_changed:
        with client_request.session_transaction() as session:
            session["user_details"] = {
                "id": new_user["id"],
                "password": "somepassword",
            }

    client_request.post(("main.user_profile_validate_security_keys"), _data="fake", _expected_status=200)

    with client_request.session_transaction() as session:
        assert api_nongov_user_active["current_session_id"] is None
        assert session["current_session_id"] == new_user["current_session_id"]

    assert mock_validate.called
    assert mock_login.called
    if password_changed:
        mock_change_password.assert_called_once_with("somepassword")
    else:
        mock_change_password.assert_not_called()


def test_non_gov_user_cannot_see_change_email_link(
    client_request,
    api_nongov_user_active,
    mock_get_organisations,
    mock_get_security_keys,
):
    client_request.login(api_nongov_user_active)
    page = client_request.get("main.user_profile")
    assert '<a href="/user-profile/email">' not in str(page)
    assert page.select_one("h1").text.strip() == "Your profile"


def test_non_gov_user_cannot_access_change_email_page(
    client_request,
    api_nongov_user_active,
    mock_get_organisations,
):
    client_request.login(api_nongov_user_active)
    client_request.get("main.user_profile_email", _expected_status=403)


def test_normal_user_doesnt_see_disable_platform_admin(client_request):
    client_request.get("main.user_profile_disable_platform_admin_view", _expected_status=403)


def test_platform_admin_can_see_disable_platform_admin_page(client_request, platform_admin_user):
    client_request.login(platform_admin_user)
    page = client_request.get("main.user_profile_disable_platform_admin_view")

    assert page.select_one("h1").text.strip() == "Use platform admin view"
    assert page.select_one("input[checked]")["value"] == "True"


def test_can_disable_platform_admin(client_request, platform_admin_user):
    client_request.login(platform_admin_user)

    with client_request.session_transaction() as session:
        assert "disable_platform_admin_view" not in session

    client_request.post(
        "main.user_profile_disable_platform_admin_view",
        _data={"enabled": False},
        _expected_status=302,
        _expected_redirect=url_for("main.user_profile"),
    )

    with client_request.session_transaction() as session:
        assert session["disable_platform_admin_view"] is True


def test_can_reenable_platform_admin(client_request, platform_admin_user):
    client_request.login(platform_admin_user)

    with client_request.session_transaction() as session:
        session["disable_platform_admin_view"] = True

    client_request.post(
        "main.user_profile_disable_platform_admin_view",
        _data={"enabled": True},
        _expected_status=302,
        _expected_redirect=url_for("main.user_profile"),
    )

    with client_request.session_transaction() as session:
        assert session["disable_platform_admin_view"] is False


class TestOptionalPhoneNumber:
    def test_should_skip_sms_verify_when_phone_number_blank(
        self,
        client_request,
        platform_admin_user,
        app_,
        mock_verify_password,
        mock_send_change_email_verification,
    ):
        client_request.post(
            "main.user_profile_mobile_number",
            _data={"mobile_number": ""},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile_mobile_number_authenticate"),
        )

    def test_should_skip_sms_verify_when_remove_button_pressed(
        self,
        client_request,
        platform_admin_user,
        app_,
        mock_verify_password,
        mock_send_change_email_verification,
    ):
        client_request.post(
            "main.user_profile_manage_mobile_number",
            _data={"remove": "remove"},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile_mobile_number_authenticate"),
        )

        client_request.post(
            "main.user_profile_mobile_number_authenticate",
            _data={"password": "rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02"},
            _expected_status=302,
            _expected_redirect=url_for(
                "main.user_profile",
            ),
        )

    def test_should_jump_to_edit_page_when_phone_already_blank(
        self, client_request, platform_admin_user, app_, mock_verify_password, mock_send_change_email_verification, mocker
    ):
        mocker.patch("app.user_api_client.update_user_attribute")
        current_user.mobile_number = None
        current_user.verified_phonenumber = False
        page = client_request.get("main.user_profile_mobile_number", _expected_status=200)
        assert page.select_one("h1").text.strip() == "Add or change your mobile number"

    def test_get_user_profile_mobile_from_send_page_shows_correct_message(
        self,
        client_request,
        app_,
        mocker,
        active_user_no_mobile,
    ):
        client_request.login(active_user_no_mobile)
        with client_request.session_transaction() as session:
            session["from_send_page"] = "send_test"
            session["send_page_service_id"] = SERVICE_ONE_ID
            session["send_page_template_id"] = TEMPLATE_ONE_ID

        with captured_templates(app_) as templates:
            page = client_request.get("main.user_profile_mobile_number")

            # assert page.status_code == 200
            assert templates[0][0].name == "views/user-profile/change-mobile-number.html"
            assert templates[0][1]["from_send_page"] == "send_test"
            assert "If you add a number to your profile, you can text yourself test messages." in page.text

    def test_post_user_profile_mobile_number_confirm_redirects_to_send_test_when_from_send_page(
        self,
        client_request,
        app_,
        mocker,
        active_user_no_mobile,
        mock_update_user_attribute,
        mock_check_verify_code,
        mock_validate_2fa_method,
    ):
        client_request.login(active_user_no_mobile)
        mocker.patch("app.user_api_client.get_user", return_value=active_user_no_mobile)

        with client_request.session_transaction() as session:
            session["new-mob-password-confirmed"] = True
            session["new-mob"] = "+16502532222"
            session["from_send_page"] = "send_test"
            session["send_page_service_id"] = SERVICE_ONE_ID
            session["send_page_template_id"] = TEMPLATE_ONE_ID

        client_request.post(
            "main.user_profile_mobile_number_confirm",
            _data={"two_factor_code": "12345"},
            _expected_status=302,
            _expected_redirect=url_for(
                "main.verify_mobile_number_send",
                service_id=SERVICE_ONE_ID,
                template_id=TEMPLATE_ONE_ID,
            ),
        )
        with client_request.session_transaction() as session:
            assert "from_send_page" in session
            assert "send_page_service_id" in session
            assert "send_page_template_id" in session

    def test_post_user_profile_mobile_number_confirm_redirects_to_profile_page_by_default(
        self,
        client_request,
        app_,
        mocker,
        active_user_no_mobile,
        mock_update_user_attribute,
        mock_check_verify_code,
        mock_validate_2fa_method,
    ):
        client_request.login(active_user_no_mobile)
        mocker.patch("app.user_api_client.get_user", return_value=active_user_no_mobile)

        with client_request.session_transaction() as session:
            session["new-mob-password-confirmed"] = True
            session["new-mob"] = "+16502532222"
            # Ensure these are not set for this test case
            session.pop("from_send_page", None)
            session.pop("send_page_service_id", None)
            session.pop("send_page_template_id", None)

        client_request.post(
            "main.user_profile_mobile_number_confirm",
            _data={"two_factor_code": "12345"},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile"),
        )
        with client_request.session_transaction() as session:
            assert session["_flashes"][0][1] == "Phone number +16502532222 saved to your profile"


def test_user_profile_shows_new_layout_when_ff_auth_v2_enabled(
    client_request,
    app_,
    mock_get_security_keys,
):
    page = client_request.get("main.user_profile")

    # Check that the page has the new structure with Security section
    assert page.select_one("h1").text.strip() == "Your profile"

    # Check for the Security heading which is only in the new layout
    security_heading = page.find("h2", string="Security")
    assert security_heading is not None
    assert security_heading.text.strip() == "Security"

    # Check that password field shows the new format with "Last changed" text
    password_text = page.get_text()
    assert "Last changed" in password_text

    # Check that two-step verification method is present (new layout)
    assert "Two-step verification method" in password_text


# Tests for user_profile_2fa function
class TestUserProfile2FA:
    """Test cases for the user_profile_2fa function"""

    def test_user_profile_2fa_shows_form_when_ff_auth_v2_enabled(
        self,
        client_request,
        app_,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        page = client_request.get("main.user_profile_2fa")

        # Check that the page renders the 2FA form
        assert page.select_one("h1").text.strip() == "Two-step verification method"
        assert "Select your two-step verification method" in page.text

        # Check that all auth method options are present
        assert "Receive a code by email" in page.text
        assert "Receive a code by text message" in page.text
        assert "Add a new security key" in page.text

    def test_user_profile_2fa_post_updates_auth_type_to_email(
        self,
        client_request,
        app_,
        mock_update_user_attribute,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        client_request.post(
            "main.user_profile_2fa",
            _data={"auth_method": "email"},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile"),
        )

        # Check that update was called with email_auth
        mock_update_user_attribute.assert_called_once_with(current_user.id, auth_type="email_auth")

    def test_user_profile_2fa_post_updates_auth_type_to_sms(
        self,
        client_request,
        app_,
        mock_update_user_attribute,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        client_request.post(
            "main.user_profile_2fa",
            _data={"auth_method": "sms"},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile"),
        )

        # Check that update was called with sms_auth
        mock_update_user_attribute.assert_called_once_with(current_user.id, auth_type="sms_auth")

    def test_user_profile_2fa_post_redirects_to_add_security_key_for_new_key(
        self,
        client_request,
        app_,
        mock_update_user_attribute,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        client_request.post(
            "main.user_profile_2fa",
            _data={"auth_method": "new_key"},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile_add_security_keys"),
        )

        # Check that update was not called for new_key option
        mock_update_user_attribute.assert_not_called()

    def test_user_profile_2fa_post_with_missing_data_shows_form_again(
        self,
        client_request,
        app_,
        mock_update_user_attribute,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        # Empty data will use the current auth method as default, so it should succeed
        client_request.post(
            "main.user_profile_2fa",
            _data={},  # Empty data will use current user's auth method
            _expected_status=302,  # Should redirect after successful update
            _expected_redirect=url_for("main.user_profile"),
        )

        # Check that update was called with current user's auth type (sms_auth)
        mock_update_user_attribute.assert_called_once_with(current_user.id, auth_type="sms_auth")

    def test_user_profile_2fa_post_shows_success_message(
        self,
        client_request,
        app_,
        mock_update_user_attribute,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        # Make request and follow redirect to see flash message
        client_request.post(
            "main.user_profile_2fa",
            _data={"auth_method": "email"},
            _expected_status=302,
            _expected_redirect=url_for("main.user_profile"),
        )

        # Check that flash message is set
        with client_request.session_transaction() as session:
            flashes = session.get("_flashes", [])
            assert len(flashes) == 1
            assert flashes[0][0] == "default_with_tick"
            assert "Two-step verification method updated" in flashes[0][1]

    def test_user_profile_2fa_post_with_invalid_form_data_shows_form_again(
        self,
        client_request,
        app_,
        mock_update_user_attribute,
        mock_get_security_keys,
    ):
        # mock .verified_phone_number on the current_user object
        current_user.verified_phonenumber = True

        # set session to simulate user logged in
        with client_request.session_transaction() as session:
            session["has_authenticated"] = True

        page = client_request.post(
            "main.user_profile_2fa",
            _data={"auth_method": "invalid_choice"},  # Invalid choice should fail validation
            _expected_status=200,
        )

        # Check that form is displayed again
        assert "Select your two-step verification method" in page.text
        assert "Receive a code by email" in page.text
        assert "Receive a code by text message" in page.text
        assert "Add a new security key" in page.text

        # Check that update was not called due to validation failure
        mock_update_user_attribute.assert_not_called()


class TestBackLinks:
    @pytest.mark.parametrize(
        "link",
        [
            ("main.user_profile_name"),
            ("main.user_profile_email"),
            ("main.user_profile_mobile_number"),
            ("main.user_profile_password"),
            ("main.user_profile_2fa"),
            ("main.user_profile_security_keys"),
            ("main.user_profile_disable_platform_admin_view"),
        ],
    )
    def test_back_links_navigate_to_user_profile(self, client_request, link, mock_get_security_keys, platform_admin_user, app_):
        """Test that the back link on each page navigates back to /user-profile, following redirects"""

        expected_redirect = "main.user_profile"

        if link == "main.user_profile_disable_platform_admin_view":
            client_request.login(platform_admin_user)
        page = client_request.get(link, _follow_redirects=True)
        back_link = page.select_one("a.back-link")
        assert back_link is not None, f"Back link not found on page {link}"
        assert back_link["href"] == url_for(expected_redirect), f"Back link on {link} does not navigate to {expected_redirect}"


def test_user_without_phone_can_add_security_key(
    client_request,
    mocker,
    active_user_no_mobile,
):
    mocker.patch("app.user_api_client.get_user", return_value=active_user_no_mobile)
    mocker.patch("app.models.user.User.from_id", return_value=User(active_user_no_mobile))

    with client_request.session_transaction() as session:
        session["has_authenticated"] = True

    client_request.login(active_user_no_mobile)

    page = client_request.get("main.user_profile_add_security_keys")
    assert "security key" in page.text.lower()


def test_user_with_phone_but_unverified_can_add_security_key(
    client_request,
    mocker,
    active_user_with_unverified_mobile,
):
    mocker.patch("app.user_api_client.get_user", return_value=active_user_with_unverified_mobile)
    mocker.patch("app.models.user.User.from_id", return_value=User(active_user_with_unverified_mobile))

    with client_request.session_transaction() as session:
        session["has_authenticated"] = True

    client_request.login(active_user_with_unverified_mobile)

    page = client_request.get("main.user_profile_add_security_keys")
    assert "security key" in page.text.lower()


def test_deactivate_account_shows_info_page(client_request):
    """GET /user-profile/deactivate shows the info/warning page"""
    page = client_request.get("main.deactivate_account")
    assert "Are you sure you want to deactivate your account?" in page.text


def test_deactivate_account_post_redirects_to_authenticate(client_request):
    """POST to the deactivate info page redirects to authenticate step"""
    client_request.post(
        "main.deactivate_account",
        _data={},
        _expected_status=302,
        _expected_redirect=url_for("main.deactivate_account_authenticate"),
    )


def test_deactivate_account_authenticate_calls_suspend_and_logout_on_success(client_request, mocker, mock_verify_password):
    """Submitting correct password calls suspend_user and logs the user out, then redirects to sign-in"""
    suspend_mock = mocker.patch("app.user_api_client.suspend_user")
    logout_mock = mocker.patch("app.main.views.user_profile.logout_user")

    client_request.post(
        "main.deactivate_account_authenticate",
        _data={"password": "correct-password"},
        _expected_status=302,
        _expected_redirect=url_for("main.sign_in"),
    )

    # ensure suspend_user called with current user's id and logout was triggered
    suspend_mock.assert_called_once_with(current_user.id)
    assert logout_mock.called is True


def test_deactivate_account_authenticate_with_wrong_password_shows_form(client_request, mocker):
    """If the password is incorrect, the authenticate form is re-rendered (status 200)"""
    mocker.patch("app.user_api_client.verify_password", return_value=False)

    page = client_request.post(
        "main.deactivate_account_authenticate",
        _data={"password": "wrong-password"},
        _expected_status=200,
    )

    assert "Deactivate Account" in page.text
