import pytest
from flask import url_for
from flask_login import current_user

from tests.conftest import normalize_spaces


def assert_no_back_link(page):
    assert len(page.select('.back-link')) == 0


def assert_has_back_link(page):
    assert len(page.select('.back-link')) == 1


def test_contact_page_does_not_require_login(client_request):
    client_request.logout()
    client_request.get('.contact')


def test_identity_step_logged_in(client_request, mocker):
    mock_send_contact_request = mocker.patch('app.user_api_client.send_contact_request')

    # No name or email address fields are present
    page = client_request.get(
        '.contact',
        _expected_status=200,
    )

    assert set(
        input['name'] for input in page.select('input')
    ) == set(['support_type', 'csrf_token'])

    # Select a contact reason and submit the form
    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'support_type': 'other'
        }
    )

    # On step 2, to type a message
    assert_has_back_link(page)
    assert page.select_one('.back-link')['href'] == url_for('.contact', current_step='identity')
    assert normalize_spaces(page.find('h1').text) == 'Tell us more'

    # Message step
    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={'message': 'My message'}
    )

    # Contact email has been sent
    assert_no_back_link(page)
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'
    mock_send_contact_request.assert_called_once()


def test_identity_step_validates(client_request):
    client_request.logout()

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
    assert_no_back_link(page)


def test_back_link_goes_to_previous_step(client_request):
    client_request.logout()

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': 'John',
            'email_address': 'john@example.com',
            'support_type': 'other'
        }
    )

    assert page.select_one('.back-link')['href'] == url_for('.contact', current_step='identity')

    page = client_request.get_url(page.select_one('.back-link')['href'], _test_page_title=False)

    # Fields have been saved and are filled
    assert page.select_one('input[checked]')['value'] == 'other'
    assert [
        (input['name'], input['value'])
        for input in page.select('input')
        if input['name'] in ['name', 'email_address']
    ] == [
        ('name', 'John'),
        ('email_address', 'john@example.com')
    ]


def test_invalid_step_name_redirects(client_request):
    client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': 'John',
            'email_address': 'john@example.com',
            'support_type': 'other'
        }
    )

    client_request.get_url(
        url_for('.contact', current_step='nope'),
        _expected_status=302,
        _expected_redirect=url_for('.contact', current_step='identity', _external=True)
    )


@pytest.mark.parametrize('support_type', [
    'ask_question', 'technical_support', 'give_feedback', 'other'
])
def test_message_step_validates(client_request, support_type, mocker):
    mock_send_contact_request = mocker.patch('app.user_api_client.send_contact_request')

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

    assert_has_back_link(page)

    assert [
        (error['data-error-label'], normalize_spaces(error.text))
        for error in page.select('.error-message')
    ] == [
        ('message', 'This field is required.')
    ]

    mock_send_contact_request.assert_not_called()


def test_saves_form_to_session(client_request, mocker):
    mock_send_contact_request = mocker.patch('app.user_api_client.send_contact_request')

    client_request.logout()

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

    assert_no_back_link(page)
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'

    mock_send_contact_request.assert_called_once()

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

    mock_send_contact_request = mocker.patch('app.user_api_client.send_contact_request')

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': 'John',
            'support_type': support_type,
            'email_address': 'john@example.com',
        }
    )

    assert_has_back_link(page)
    assert normalize_spaces(page.find('h1').text) == expected_heading

    message = 'This is my message'
    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={'message': message}
    )

    assert_no_back_link(page)
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'

    profile = url_for('.user_information', user_id=current_user.id, _external=True)

    mock_send_contact_request.assert_called_once_with(
        {
            'message': message,
            'name': 'John',
            'support_type': support_type,
            'email_address': 'john@example.com',
            'user_profile': profile,
            'friendly_support_type': friendly_support_type
        })


def test_demo_steps_success(client_request, mocker):
    mock_send_contact_request = mocker.patch('app.user_api_client.send_contact_request')

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
    assert_has_back_link(page)
    assert normalize_spaces(page.find('h1').text) == 'Set up a demo'
    assert 'Step 1 of 2' in page.text
    page = submit_form(['department_org_name', 'program_service_name', 'intended_recipients'])

    # Main use case step
    assert len(page.select('.back-link')) == 1
    assert normalize_spaces(page.find('h1').text) == 'Set up a demo'
    assert 'Step 2 of 2' in page.text
    page = submit_form(['main_use_case', 'main_use_case_details'])

    # Thank you page
    assert_no_back_link(page)
    assert normalize_spaces(page.find('h1').text) == 'Thanks for contacting us'

    mock_send_contact_request.assert_called_once_with(
        {
            'intended_recipients': data['intended_recipients'],
            'support_type': data['support_type'],
            'email_address': data['email_address'],
            'name': data['name'],
            'main_use_case': data['main_use_case'],
            'main_use_case_details': data['main_use_case_details'],
            'program_service_name': data['program_service_name'],
            'department_org_name': data['department_org_name'],
            'user_profile': url_for('.user_information', user_id=current_user.id, _external=True),
            'friendly_support_type': 'Set up a demo to learn more about GC Notify'
        }
    )

    # Going back
    page = client_request.get('.contact', _test_page_title=False)

    # Fields are blank
    assert page.select_one('input[checked]') is None


@pytest.mark.parametrize('input_name, input_value, has_error', [
    ('name', '', True),
    ('email_address', 'invalid', True),
    ('support_type', 'invalid', True),
    ('department_org_name', '', True),
    ('program_service_name', '', True),
    ('intended_recipients', 'invalid', True),
    ('main_use_case', 'invalid', True),
    ('main_use_case_details', '', True),
    ('main_use_case_details', 'awesome', False),
])
def test_demo_steps_validation(
    client_request,
    mocker,
    input_name,
    input_value,
    has_error,
):
    mock_send_contact_request = mocker.patch('app.user_api_client.send_contact_request')

    valid_data = {
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
        keys_to_use = [k for k in keys if k != input_name]
        default_data = {k: v for k, v in valid_data.items() if k in keys_to_use}
        return client_request.post(
            '.contact',
            _expected_status=200,
            _data={**default_data, **{input_name: input_value}}
        )

    client_request.logout()

    fields_by_step = [
        ['name', 'email_address', 'support_type'],
        ['department_org_name', 'program_service_name', 'intended_recipients'],
        ['main_use_case', 'main_use_case_details'],
    ]

    for fields_group in fields_by_step:
        # Submit as many steps as we can until we encounter an error
        # caused by a custom input value
        page = submit_form(fields_group)

        # Making sure that the error is flagged
        if input_name in fields_group and has_error:
            assert [
                error['data-error-label'] for error in page.select('.error-message')
            ] == [input_name]
            mock_send_contact_request.assert_not_called()
            return
        # Submitted only valid data, no errors
        else:
            assert page.select('.error-message') == []

    mock_send_contact_request.assert_called_once()
