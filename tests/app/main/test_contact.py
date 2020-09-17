import pytest

from app.main.forms import ContactNotifyTeam
from tests.conftest import normalize_spaces


@pytest.mark.parametrize('name, support_type, email_address, feedback, error_fields', [
    ('John', 'Ask a question', 'john@example.com', '', ['feedback']),
    ('John', 'Ask a question', 'john@example.com', 'Hello!', []),
    ('', '', '', '', ['name', 'support_type', 'email_address', 'feedback']),
])
def test_form_fails_validation_without_required_fields(
    app_,
    name,
    support_type,
    email_address,
    feedback,
    error_fields
):
    data = {
        'name': name,
        'support_type': support_type,
        'email_address': email_address,
        'feedback': feedback,
    }
    with app_.test_request_context(method='POST', data=data):
        form = ContactNotifyTeam()

        if len(error_fields):
            assert not form.validate_on_submit()
        else:
            assert form.validate_on_submit()

        assert len(form.errors) == len(error_fields)

        for field in error_fields:
            assert form.errors[field] is not None


def test_form_validation_fails_with_invalid_email_address_field(app_):
    data = {
        'name': 'John',
        'support_type': 'Ask a question',
        'email_address': 'nope',
        'feedback': 'Awesome',
    }

    with app_.test_request_context(method='POST', data=data):
        form = ContactNotifyTeam()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert form.errors['email_address'] == ['Enter a valid email address']


def test_form_validation_fails_with_invalid_support_type_field(app_):
    data = {
        'name': 'John',
        'support_type': 'Hello',
        'email_address': 'john@example.com',
        'feedback': 'Awesome',
    }

    with app_.test_request_context(method='POST', data=data):
        form = ContactNotifyTeam()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert form.errors['support_type'] == ['Not a valid choice']


def test_submit_contact_form_with_honeypot(
    client_request,
    mocker,
):
    mock_send_contact_email = mocker.patch(
        'app.user_api_client.send_contact_email'
    )

    client_request.post(
        '.contact',
        _expected_status=403,
        _data={
            'name': 'John',
            'support_type': 'Ask a question',
            'email_address': 'john@example.com',
            'feedback': 'Awesome',
            'phone': 'should not fill'
        }
    )

    assert not mock_send_contact_email.called


def test_submit_contact_form_validates(
    client_request,
    mocker,
):
    mock_send_contact_email = mocker.patch(
        'app.user_api_client.send_contact_email'
    )

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data={
            'name': '',
            'support_type': 'Ask a question',
            'email_address': 'john@example.com',
            'feedback': ''
        }
    )
    assert [
        (error['data-error-label'], normalize_spaces(error.text))
        for error in page.select('.error-message')
    ] == [
        ('name', 'This cannot be empty'),
        ('feedback', 'This cannot be empty'),
    ]
    assert mock_send_contact_email.called is False


def test_submit_contact_form_sends_ticket(
    client_request,
    mocker,
):
    mock_send_contact_email = mocker.patch(
        'app.user_api_client.send_contact_email'
    )

    data = {
        'name': 'John',
        'support_type': 'Ask a question',
        'email_address': 'john@example.com',
        'feedback': 'Awesome'
    }

    page = client_request.post(
        '.contact',
        _expected_status=200,
        _data=data
    )

    assert normalize_spaces(page.select_one('h1').text) == 'Thanks for contacting us'
    mock_send_contact_email.assert_called_once_with(
        data['name'],
        data['email_address'],
        data['feedback'],
        data['support_type']
    )
