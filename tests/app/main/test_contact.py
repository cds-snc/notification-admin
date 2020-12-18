import pytest
from flask import url_for
from flask_login import current_user

from tests.conftest import normalize_spaces


def test_identity_step_validates(client_request):
    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': '',
            'email_address': 'foo',
            'support_type': ''
        }
    )
    assert [
        (error['data-error-label'], normalize_spaces(error.text))
        for error in page.select('.error-message')
    ] == [
        ('name', 'This cannot be empty'),
        ('email_address', 'Enter a valid email address'),
        ('support_type', 'You need to choose an option'),
    ]

    assert len(page.select('.back-link')) == 0


@pytest.mark.parametrize('support_type', [
    'ask_question', 'technical_support', 'give_feedback', 'other'
])
def test_message_step_valides(client_request, support_type, mocker):
    mock_send_contact_email = mocker.patch('app.user_api_client.send_contact_email')

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': 'John',
            'email_address': 'john@example.com',
            'support_type': support_type
        }
    )

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={'message': ''}
    )

    assert len(page.select('.back-link')) == 1

    assert [
        (error['data-error-label'], normalize_spaces(error.text))
        for error in page.select('.error-message')
    ] == [
        ('message', 'This field is required.')
    ]

    mock_send_contact_email.assert_not_called()


def test_saves_form_to_session(client_request, mocker):
    mock_send_contact_email = mocker.patch('app.user_api_client.send_contact_email')

    client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': '',
            'email_address': 'john@example.com',
            'support_type': 'other'
        }
    )

    # Leaving form
    client_request.get('.security')

    # Going back
    page = client_request.get('.contact', _test_page_title=False)

    # Fields have been saved and are filled
    assert page.select_one('input[checked]')['value'] == 'other'
    assert [
        (input['name'], input['value'])
        for input in page.select('input')
        if input['name'] in ['name', 'email_address']
    ] == [
        ('name', ''),
        ('email_address', 'john@example.com')
    ]

    # Validating first step
    client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': 'John',
            'email_address': 'john@example.com',
            'support_type': 'other'
        }
    )

    # Leaving form
    client_request.get('.security')

    # Going back
    page = client_request.get('.contact', _test_page_title=False)
    assert normalize_spaces(page.find('h1').text) == 'Tell us more'

    # Filling a message
    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={'message': 'My message'}
    )

    assert len(page.select('.back-link')) == 0
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'

    mock_send_contact_email.assert_called_once()

    # Going back
    page = client_request.get('.contact', _test_page_title=False)

    # Fields are blank
    assert page.select_one('input[checked]') is None
    assert [
        (input['name'], input['value'])
        for input in page.select('input')
        if input['name'] in ['name', 'email_address']
    ] == [
        ('name', ''),
        ('email_address', '')
    ]


@pytest.mark.parametrize('support_type, expected_heading, friendly_support_type', [
    ('ask_question', 'Ask a question', 'Ask a question'),
    ('technical_support', 'Get technical support', 'Get technical support'),
    ('give_feedback', 'Give feedback', 'Give feedback'),
    ('other', 'Tell us more', 'Other'),
])
def test_all_reasons_message_step_success(
    client_request,
    mocker,
    support_type,
    expected_heading,
    friendly_support_type,
):

    mock_send_contact_email = mocker.patch('app.user_api_client.send_contact_email')

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': 'John',
            'support_type': support_type,
            'email_address': 'john@example.com',
        }
    )

    assert len(page.select('.back-link')) == 1
    assert normalize_spaces(page.find('h1').text) == expected_heading

    message = 'This is my message'
    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={'message': message}
    )

    assert len(page.select('.back-link')) == 0
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'

    profile = url_for('.user_information', user_id=current_user.id, _external=True)
    expected_message = f'{message}<br><br>---<br><br> {profile}'

    mock_send_contact_email.assert_called_once_with(
        'John',
        'john@example.com',
        expected_message,
        friendly_support_type
    )
