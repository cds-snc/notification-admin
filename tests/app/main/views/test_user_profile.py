import json
import uuid

import pytest
from flask import url_for
from notifications_utils.url_safe_token import generate_token

from tests.conftest import api_user_active as create_user
from tests.conftest import url_for_endpoint_with_token


def test_should_show_overview_page(
    client_request,
    mock_get_security_keys
):
    page = client_request.get(('main.user_profile'))
    assert page.select_one('h1').text.strip() == 'Your profile'
    assert 'Use platform admin view' not in page


def test_overview_page_shows_disable_for_platform_admin(
    client_request,
    platform_admin_user,
    mock_get_security_keys
):
    client_request.login(platform_admin_user)
    page = client_request.get(('main.user_profile'))
    assert page.select_one('h1').text.strip() == 'Your profile'
    disable_platform_admin_row = page.select('tr')[-1]
    assert ' '.join(disable_platform_admin_row.text.split()) == 'Use platform admin view Yes Change'


def test_should_show_name_page(
    client_request,
    mock_get_security_keys
):
    page = client_request.get(('main.user_profile_name'))
    assert page.select_one('h1').text.strip() == 'Change your name'


def test_should_redirect_after_name_change(
    client_request,
    mock_update_user_attribute,
    mock_email_is_not_already_in_use,
    mock_get_security_keys
):
    client_request.post(
        'main.user_profile_name',
        _data={'new_name': 'New Name'},
        _expected_status=302,
        _expected_redirect=url_for('main.user_profile', _external=True),
    )
    assert mock_update_user_attribute.called is True


def test_should_show_email_page(
    client_request,
):
    page = client_request.get(
        'main.user_profile_email'
    )
    assert page.select_one('h1').text.strip() == 'Change your email address'


def test_should_redirect_after_email_change(
    client_request,
    mock_login,
    mock_email_is_not_already_in_use,
):
    client_request.post(
        'main.user_profile_email',
        _data={'email_address': 'new_notify@notify.canada.ca'},
        _expected_status=302,
        _expected_redirect=url_for(
            'main.user_profile_email_authenticate',
            _external=True,
        )
    )


def test_should_show_authenticate_after_email_change(
    client_request,
):
    with client_request.session_transaction() as session:
        session['new-email'] = 'new_notify@notify.canada.ca'

    page = client_request.get('main.user_profile_email_authenticate')

    assert 'Change your email address' in page.text
    assert 'Confirm' in page.text


def test_should_render_change_email_continue_after_authenticate_email(
    client_request,
    mock_verify_password,
    mock_send_change_email_verification,
):
    with client_request.session_transaction() as session:
        session['new-email'] = 'new_notify@notify.canada.ca'
    page = client_request.post(
        'main.user_profile_email_authenticate',
        data={'password': 'rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02'},
        _expected_status=200,
    )
    assert 'Click the link in the email to confirm the change to your email address.' in page.text


def test_should_redirect_to_user_profile_when_user_confirms_email_link(
    app_,
    logged_in_client,
    api_user_active,
    mock_update_user_attribute,
):

    token = generate_token(payload=json.dumps({'user_id': api_user_active['id'], 'email': 'new_email@canada.ca'}),
                           secret=app_.config['SECRET_KEY'], salt=app_.config['DANGEROUS_SALT'])
    response = logged_in_client.get(url_for_endpoint_with_token('main.user_profile_email_confirm',
                                                                token=token))

    assert response.status_code == 302
    assert response.location == url_for('main.user_profile', _external=True)


def test_should_show_mobile_number_page(
    client_request,
):
    page = client_request.get(('main.user_profile_mobile_number'))
    assert 'Change your mobile number' in page.text


@pytest.mark.parametrize('phone_number_to_register_with', [
    '+16502532222',
    '+4966921809',
])
def test_should_redirect_after_mobile_number_change(
    client_request,
    phone_number_to_register_with,
):
    client_request.post(
        'main.user_profile_mobile_number',
        _data={'mobile_number': phone_number_to_register_with},
        _expected_status=302,
        _expected_redirect=url_for(
            'main.user_profile_mobile_number_authenticate',
            _external=True,
        )
    )
    with client_request.session_transaction() as session:
        assert session['new-mob'] == phone_number_to_register_with


def test_should_show_authenticate_after_mobile_number_change(
    client_request,
):
    with client_request.session_transaction() as session:
        session['new-mob'] = '+441234123123'

    page = client_request.get(
        'main.user_profile_mobile_number_authenticate',
    )

    assert 'Change your mobile number' in page.text
    assert 'Confirm' in page.text


def test_should_redirect_after_mobile_number_authenticate(
    client_request,
    mock_verify_password,
    mock_send_verify_code,
):
    with client_request.session_transaction() as session:
        session['new-mob'] = '+441234123123'

    client_request.post(
        'main.user_profile_mobile_number_authenticate',
        _data={'password': 'rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02'},
        _expected_status=302,
        _expected_redirect=url_for(
            'main.user_profile_mobile_number_confirm',
            _external=True,
        )
    )


def test_should_show_confirm_after_mobile_number_change(
    client_request,
):
    with client_request.session_transaction() as session:
        session['new-mob-password-confirmed'] = True
    page = client_request.get(
        'main.user_profile_mobile_number_confirm'
    )

    assert 'Change your mobile number' in page.text
    assert 'Confirm' in page.text


@pytest.mark.parametrize('phone_number_to_register_with', [
    '+16502532222',
    '+4966921809',
])
def test_should_redirect_after_mobile_number_confirm(
    client_request,
    mocker,
    mock_update_user_attribute,
    mock_check_verify_code,
    fake_uuid,
    phone_number_to_register_with,
):
    user_before = create_user(fake_uuid)
    user_after = create_user(fake_uuid)
    user_before['current_session_id'] = str(uuid.UUID(int=1))
    user_after['current_session_id'] = str(uuid.UUID(int=2))

    # first time (login decorator) return normally, second time (after 2FA return with new session id)
    mocker.patch('app.user_api_client.get_user', side_effect=[user_before, user_after])

    with client_request.session_transaction() as session:
        session['new-mob-password-confirmed'] = True
        session['new-mob'] = phone_number_to_register_with
        session['current_session_id'] = user_before['current_session_id']

    client_request.post(
        'main.user_profile_mobile_number_confirm',
        _data={'two_factor_code': '12345'},
        _expected_status=302,
        _expected_redirect=url_for(
            'main.user_profile',
            _external=True,
        )
    )

    # make sure the current_session_id has changed to what the API returned
    with client_request.session_transaction() as session:
        assert session['current_session_id'] == user_after['current_session_id']


def test_should_show_password_page(
    client_request,
):
    page = client_request.get(('main.user_profile_password'))

    assert page.select_one('h1').text.strip() == 'Change your password'


def test_should_redirect_after_password_change(
    client_request,
    mock_update_user_password,
    mock_verify_password,
):
    client_request.post(
        'main.user_profile_password',
        _data={
            'new_password': 'A97592577C84C4E9F5C956666401B2904149194A68211D0A791C1E13A3181239',
            'old_password': 'rZXdoBkuz6U37DDXIaAfpBR1OTJcSZOGICLCz4dMtmopS3KsVauIrtcgqs1eU02',
        },
        _expected_status=302,
        _expected_redirect=url_for(
            'main.user_profile',
            _external=True,
        ),
    )


def test_non_gov_user_cannot_see_change_email_link(
    client_request,
    api_nongov_user_active,
    mock_get_organisations,
    mock_get_security_keys
):
    client_request.login(api_nongov_user_active)
    page = client_request.get('main.user_profile')
    assert '<a href="/user-profile/email">' not in str(page)
    assert page.select_one('h1').text.strip() == 'Your profile'


def test_non_gov_user_cannot_access_change_email_page(
    client_request,
    api_nongov_user_active,
    mock_get_organisations,
):
    client_request.login(api_nongov_user_active)
    client_request.get('main.user_profile_email', _expected_status=403)


def test_normal_user_doesnt_see_disable_platform_admin(client_request):
    client_request.get('main.user_profile_disable_platform_admin_view', _expected_status=403)


def test_platform_admin_can_see_disable_platform_admin_page(client_request, platform_admin_user):
    client_request.login(platform_admin_user)
    page = client_request.get('main.user_profile_disable_platform_admin_view')

    assert page.select_one('h1').text.strip() == 'Use platform admin view'
    assert page.select_one('input[checked]')['value'] == 'True'


def test_can_disable_platform_admin(client_request, platform_admin_user):
    client_request.login(platform_admin_user)

    with client_request.session_transaction() as session:
        assert 'disable_platform_admin_view' not in session

    client_request.post(
        'main.user_profile_disable_platform_admin_view',
        _data={'enabled': False},
        _expected_status=302,
        _expected_redirect=url_for('main.user_profile', _external=True),
    )

    with client_request.session_transaction() as session:
        assert session['disable_platform_admin_view'] is True


def test_can_reenable_platform_admin(client_request, platform_admin_user):
    client_request.login(platform_admin_user)

    with client_request.session_transaction() as session:
        session['disable_platform_admin_view'] = True

    client_request.post(
        'main.user_profile_disable_platform_admin_view',
        _data={'enabled': True},
        _expected_status=302,
        _expected_redirect=url_for('main.user_profile', _external=True),
    )

    with client_request.session_transaction() as session:
        assert session['disable_platform_admin_view'] is False
