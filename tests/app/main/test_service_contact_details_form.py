import pytest

from app.main.forms import ServiceContactDetailsForm


def test_form_fails_validation_with_no_radio_buttons_selected(app_):
    with app_.test_request_context(method='POST', data={}):
        form = ServiceContactDetailsForm()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert form.errors['contact_details_type'] == ['Not a valid choice']


@pytest.mark.parametrize('selected_radio_button, selected_text_box, text_box_data', [
    ('email_address', 'url', 'http://www.example.com'),
    ('phone_number', 'url', 'http://www.example.com'),
    ('url', 'email_address', 'user@example.com'),
    ('phone_number', 'email_address', 'user@example.com'),
    ('url', 'phone_number', '6502532222'),
    ('email_address', 'phone_number', '6502532222'),
])
def test_form_fails_validation_when_radio_button_selected_and_text_box_filled_in_do_not_match(
    app_,
    selected_radio_button,
    selected_text_box,
    text_box_data
):
    data = {'contact_details_type': selected_radio_button, selected_text_box: text_box_data}

    with app_.test_request_context(method='POST', data=data):
        form = ServiceContactDetailsForm()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert form.errors[selected_radio_button] == ['This field is required.']


@pytest.mark.parametrize('selected_field, url, email_address, phone_number', [
    ('url', 'http://www.example.com', 'invalid-email.com', 'phone'),
    ('email_address', 'www.invalid-url.com', 'me@example.com', 'phone'),
    ('phone_number', 'www.invalid-url.com', 'invalid-email.com', '6502532222'),
])
def test_form_only_validates_the_field_which_matches_the_selected_radio_button(
    app_,
    selected_field,
    url,
    email_address,
    phone_number,
):
    data = {'contact_details_type': selected_field,
            'url': url,
            'email_address': email_address,
            'phone_number': phone_number}

    with app_.test_request_context(method='POST', data=data):
        form = ServiceContactDetailsForm()

        assert form.validate_on_submit()


def test_form_url_validation_fails_with_invalid_url_field(app_):
    data = {'contact_details_type': 'url', 'url': 'www.example.com'}

    with app_.test_request_context(method='POST', data=data):
        form = ServiceContactDetailsForm()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert len(form.errors['url']) == 1


def test_form_email_validation_fails_with_invalid_email_address_field(app_):
    data = {'contact_details_type': 'email_address', 'email_address': '1@co'}

    with app_.test_request_context(method='POST', data=data):
        form = ServiceContactDetailsForm()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert len(form.errors['email_address']) == 2


def test_form_phone_number_validation_fails_with_invalid_phone_number_field(app_):
    data = {'contact_details_type': 'phone_number', 'phone_number': '1235 A'}

    with app_.test_request_context(method='POST', data=data):
        form = ServiceContactDetailsForm()

        assert not form.validate_on_submit()
        assert len(form.errors) == 1
        assert form.errors['phone_number'] == ['Must be a valid phone number']
