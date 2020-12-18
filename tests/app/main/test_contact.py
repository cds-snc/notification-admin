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


def test_demo_steps_success(client_request, mocker):
    mock_send_contact_email = mocker.patch('app.user_api_client.send_contact_email')

    data = {
        'name': 'John',
        'email_address': 'john@example.com',
        'support_type': 'demo',
        'department_org_name': 'My department',
        'program_service_name': 'My service',
        'intended_recipients': 'public',
        'main_use_case': 'status_updates',
        'main_use_case_details': 'Password resets for our app',
    }

    def submit_form(keys):
        return client_request.post(
            '.contact',
            _expected_status=200,
            _data={k: v for k, v in data.items() if k in keys}
        )

    # Identity step
    page = submit_form(['name', 'email_address', 'support_type'])

    # Department step
    assert len(page.select('.back-link')) == 1
    assert normalize_spaces(page.find('h1').text) == 'Set up a demo'
    assert 'Step 1 out of 2' in page.text
    page = submit_form(['department_org_name', 'program_service_name', 'intended_recipients'])

    # Main use case step
    assert len(page.select('.back-link')) == 1
    assert normalize_spaces(page.find('h1').text) == 'Set up a demo'
    assert 'Step 2 out of 2' in page.text
    page = submit_form(['main_use_case', 'main_use_case_details'])

    # Thank you page
    assert len(page.select('.back-link')) == 0
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'

    expected_message = '<br><br>'.join([
        f'- user: {data["name"]} {data["email_address"]}',
        f'- department/org: {data["department_org_name"]}',
        f'- program/service: {data["program_service_name"]}',
        f'- intended_recipients: {data["intended_recipients"]}',
        f'- main use case: {data["main_use_case"]}',
        f'- main use case details: {data["main_use_case_details"]}',
        '---',
        f" {url_for('.user_information', user_id=current_user.id, _external=True)}"
    ])

    mock_send_contact_email.assert_called_once_with(
        data['name'],
        data['email_address'],
        expected_message,
        'Set up a demo to learn more about GC Notify'
    )

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
