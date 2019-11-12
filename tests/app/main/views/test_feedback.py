import pytest
from flask import url_for

from app.main.views.feedback import has_live_services
from tests.conftest import (
    mock_get_services,
    mock_get_services_with_no_services,
    mock_get_services_with_one_service,
    normalize_spaces,
)


def no_redirect():
    return lambda _external=True: None


@pytest.mark.parametrize('endpoint', [
    'main.old_feedback',
    'main.support',
])
def test_get_support_index_page(
    client,
    endpoint,
):
    response = client.get(url_for('main.support'), follow_redirects=True)
    assert response.status_code == 200


@pytest.mark.parametrize('get_services_mock, expected_return_value', [
    (mock_get_services, True),
    (mock_get_services_with_no_services, False),
    (mock_get_services_with_one_service, False),
])
def test_has_live_services(
    mocker,
    fake_uuid,
    get_services_mock,
    expected_return_value
):
    get_services_mock(mocker, fake_uuid)
    assert has_live_services(12345) == expected_return_value


@pytest.mark.parametrize('out_of_hours_emergency, email_address_provided, out_of_hours, message', (

    # Out of hours emergencies trump everything else
    (
        True, True, True,
        'We’ll reply in the next 30 minutes.',
    ),
    (
        True, False, False,  # Not a real scenario
        'We’ll reply in the next 30 minutes.',
    ),

    # Anonymous tickets don’t promise a reply
    (
        False, False, False,
        'We’ll read your message in the next 30 minutes.',
    ),
    (
        False, False, True,
        'We’ll read your message when we’re back in the office.',
    ),

    # When we look at your ticket depends on whether we’re in normal
    # business hours
    (
        False, True, False,
        'We’ll read your message in the next 30 minutes and reply within one working day.',
    ),
    (
        False, True, True,
        'We’ll reply within one working day.'
    ),

))
def test_thanks(
    client_request,
    mocker,
    api_user_active,
    mock_get_user,
    out_of_hours_emergency,
    email_address_provided,
    out_of_hours,
    message,
):
    mocker.patch('app.main.views.feedback.in_business_hours', return_value=(not out_of_hours))
    page = client_request.get(
        'main.thanks',
        out_of_hours_emergency=out_of_hours_emergency,
        email_address_provided=email_address_provided,
    )
    assert normalize_spaces(page.find('main').find('p').text) == message
