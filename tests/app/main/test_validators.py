from unittest.mock import Mock

import pytest
from wtforms import ValidationError

from app.main.forms import RegisterUserForm, ServiceSmsSenderForm
from app.main.validators import (
    NoCommasInPlaceHolders,
    OnlySMSCharacters,
    ValidGovEmail,
)


@pytest.mark.parametrize('password', [
    'notification', '11111111', 'kittykat', 'blackbox'
])
def test_should_raise_validation_error_for_password(
    client,
    mock_get_user_by_email,
    password,
):
    form = RegisterUserForm()
    form.name.data = 'test'
    form.email_address.data = 'teset@example.gc.ca'
    form.mobile_number.data = '16502532222'
    form.password.data = password

    form.validate()
    assert 'Choose a password that’s harder to guess' in form.errors['password']


def test_valid_email_not_in_valid_domains(
    client,
    mock_get_organisations,
):
    form = RegisterUserForm(email_address="test@test.com", mobile_number='16502532222')
    assert not form.validate()
    assert "Enter a government email address" in form.errors['email_address'][0]


def test_valid_email_in_valid_domains(
    client
):
    form = RegisterUserForm(
        name="test",
        email_address="test@my.gc.ca",
        mobile_number='6502532222',
        password='an uncommon password')
    form.validate()
    assert form.errors == {}


def test_invalid_email_address_error_message(
    client,
    mock_get_organisations,
):
    form = RegisterUserForm(
        name="test",
        email_address="test.com",
        mobile_number='6502532222',
        password='1234567890')
    assert not form.validate()

    form = RegisterUserForm(
        name="test",
        email_address="test.com",
        mobile_number='6502532222',
        password='1234567890')
    assert not form.validate()


def _gen_mock_field(x):
    return Mock(data=x)


@pytest.mark.parametrize("email", [
    'test@canada.ca',
    'test@CANADA.CA',
    'test@cds-snc.CA',
    'test@test.test.gc.ca',
    'test@test.gc.ca'
])
def test_valid_list_of_white_list_email_domains(
    client,
    email,
):
    email_domain_validators = ValidGovEmail()
    email_domain_validators(None, _gen_mock_field(email))


@pytest.mark.parametrize("email", [
    'test@cacanada.ca',
    'test@gc.ca.ca',
    'test@gc.test.ca',
    'test@camod.ca',
    'test@canada.ca.ca',
    'test@canada.test.ca',
    'test@caddc-canada.org',
    'test@canada.org.ca',
    'test@canada.ca.org',
    'test@cacanada.scot',
])
def test_invalid_list_of_white_list_email_domains(
    client,
    email,
    mock_get_organisations,
):
    email_domain_validators = ValidGovEmail()
    with pytest.raises(ValidationError):
        email_domain_validators(None, _gen_mock_field(email))


def test_for_commas_in_placeholders(
    client
):
    with pytest.raises(ValidationError) as error:
        NoCommasInPlaceHolders()(None, _gen_mock_field('Hello ((name,date))'))
    assert str(error.value) == 'You cannot put commas between double brackets'
    NoCommasInPlaceHolders()(None, _gen_mock_field('Hello ((name))'))


@pytest.mark.parametrize('msg', ['The quick brown fox', 'Thé “quick” bröwn fox\u200B'])
def test_sms_character_validation(client, msg):
    OnlySMSCharacters()(None, _gen_mock_field(msg))


@pytest.mark.parametrize('data, err_msg', [
    (
        '∆ abc 📲 def 📵 ghi',
        (
            'You can’t use ∆, 📲 or 📵 in text messages. '
            'They won’t show up properly on everyone’s phones.'
        )
    ),
    (
        '📵',
        (
            'You can’t use 📵 in text messages. '
            'It won’t show up properly on everyone’s phones.'
        )
    ),
])
def test_non_sms_character_validation(data, err_msg, client):
    with pytest.raises(ValidationError) as error:
        OnlySMSCharacters()(None, _gen_mock_field(data))

    assert str(error.value) == err_msg


def test_sms_sender_form_validation(
    client,
    mock_get_user_by_email,
):
    form = ServiceSmsSenderForm()

    form.sms_sender.data = 'elevenchars'
    form.validate()
    assert not form.errors

    form.sms_sender.data = ''
    form.validate()
    assert "This cannot be empty" == form.errors['sms_sender'][0]

    form.sms_sender.data = 'morethanelevenchars'
    form.validate()
    assert "Enter 11 characters or fewer" == form.errors['sms_sender'][0]

    form.sms_sender.data = '###########'
    form.validate()
    assert 'Use letters and numbers only' == form.errors['sms_sender'][0]

    form.sms_sender.data = '333'
    form.validate()
    assert 'Enter 4 characters or more' == form.errors['sms_sender'][0]

    form.sms_sender.data = '4444'
    form.validate()
    assert not form.errors

    form.sms_sender.data = '00111222333'
    form.validate()
    assert "Can't start with 00" == form.errors['sms_sender'][0]
