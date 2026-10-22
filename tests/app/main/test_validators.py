import base64
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from app.main.forms import OptionalIntegerRange, RegisterUserForm, ServiceSmsSenderForm, ValidTeamMemberDomain
from app.main.validators import (
    NoCommasInPlaceHolders,
    OnlySMSCharacters,
    ValidGovEmail,
    _is_localhost_url,
    characters_to_remove_from_email_from,
    characters_to_remove_from_name,
    get_from_header_length,
    get_max_email_from_length,
    get_max_service_name_length,
    is_from_header_too_long,
    validate_combined_email_header_length,
)
from flask import g
from wtforms import ValidationError
from wtforms.validators import StopValidation

from tests.conftest import set_config


@pytest.mark.parametrize("password", ["notification", "11111111", "kittykat", "blackbox"])
def test_should_raise_validation_error_for_password(
    client,
    mock_get_user_by_email,
    password,
):
    form = RegisterUserForm()
    form.name.data = "test"
    form.email_address.data = "teset@example.gc.ca"
    form.mobile_number.data = "16502532222"
    form.password.data = password

    form.validate()

    assert (
        "Use a mix of at least 8 numbers, special characters, upper and lower case letters. Separate any words with a space."
        in form.errors["password"][0]
    )


def test_valid_email_not_in_valid_domains(
    client,
    mock_get_organisations,
):
    form = RegisterUserForm(email_address="test@test.com", mobile_number="16502532222")
    assert not form.validate()
    assert "not on our list of government domains" in form.errors["email_address"][0]


def test_valid_email_in_valid_domains(client):
    form = RegisterUserForm(
        name="test",
        email_address="test@my.gc.ca",
        mobile_number="6502532222",
        password="an uncommon password",
        tou_agreed="true",
    )
    form.validate()
    assert form.errors == {}


def test_invalid_email_address_error_message(
    client,
    mock_get_organisations,
):
    form = RegisterUserForm(
        name="test",
        email_address="test.com",
        mobile_number="6502532222",
        password="1234567890",
    )
    assert not form.validate()

    form = RegisterUserForm(
        name="test",
        email_address="test.com",
        mobile_number="6502532222",
        password="1234567890",
    )
    assert not form.validate()


def _gen_mock_field(x):
    return Mock(data=x)


@pytest.mark.parametrize(
    "email",
    [
        "test@canada.ca",
        "test@CANADA.CA",
        "test@cds-snc.CA",
        "test@test.test.gc.ca",
        "test@test.gc.ca",
    ],
)
def test_valid_list_of_white_list_email_domains(
    client,
    email,
):
    email_domain_validators = ValidGovEmail()
    email_domain_validators(None, _gen_mock_field(email))


@pytest.mark.parametrize(
    "email, raises",
    [
        ("test@team-domain.ca", False),
        ("test@cds-snc.ca", False),
        ("test@not-my-team.ca", True),
        ("test@any.domain.gc.ca", False),
        ("test@servicecanada.gc.ca", False),
        ("test@trickygc.ca", True),
    ],
)
def test_valid_team_only_email_domains(email, app_, raises):
    with app_.app_context(), app_.test_request_context():
        g.team_member_email_domains = set(["team-domain.ca", "cds-snc.ca", "gc.ca"])

        team_only_domain_validator = ValidTeamMemberDomain()

        if raises:
            with pytest.raises(ValidationError):
                team_only_domain_validator(None, _gen_mock_field(email))
        else:
            team_only_domain_validator(None, _gen_mock_field(email))


@pytest.mark.parametrize(
    "email",
    [
        "test@cacanada.ca",
        "test@gc.ca.ca",
        "test@gc.test.ca",
        "test@camod.ca",
        "test@canada.ca.ca",
        "test@canada.test.ca",
        "test@caddc-canada.org",
        "test@canada.org.ca",
        "test@canada.ca.org",
        "test@cacanada.scot",
    ],
)
def test_invalid_list_of_white_list_email_domains(
    client,
    email,
    mock_get_organisations,
):
    email_domain_validators = ValidGovEmail()
    with pytest.raises(ValidationError):
        email_domain_validators(None, _gen_mock_field(email))


@pytest.mark.parametrize(
    "email",
    [
        "test@parl.gc.ca",
        "test@notify.parl.gc.ca",
    ],
)
def test_blocked_signup_email_domains_are_rejected(client, app_, email):
    with app_.app_context():
        app_.config["BLOCKED_SIGNUP_EMAIL_DOMAINS"] = ["parl.gc.ca"]

        email_domain_validator = ValidGovEmail()
        with pytest.raises(ValidationError) as error:
            email_domain_validator(None, _gen_mock_field(email))

        assert "not on our list of government domains" in str(error.value)


def test_for_commas_in_placeholders(client):
    with pytest.raises(ValidationError) as error:
        NoCommasInPlaceHolders()(None, _gen_mock_field("Hello ((name,date))"))
    assert str(error.value) == "You cannot put commas between double brackets"
    NoCommasInPlaceHolders()(None, _gen_mock_field("Hello ((name))"))


@pytest.mark.parametrize("msg", ["The quick brown fox", "Thé “quick” bröwn fox\u200b"])
def test_sms_character_validation(client, msg):
    OnlySMSCharacters()(None, _gen_mock_field(msg))


@pytest.mark.parametrize(
    "data, err_msg",
    [
        (
            "∆ abc 📲 def 📵 ghi",
            ("You can’t use ∆, 📲 or 📵 in text messages. They won’t show up properly on everyone’s phones."),
        ),
        (
            "📵",
            ("You can’t use 📵 in text messages. It won’t show up properly on everyone’s phones."),
        ),
    ],
)
def test_non_sms_character_validation(data, err_msg, client):
    with pytest.raises(ValidationError) as error:
        OnlySMSCharacters()(None, _gen_mock_field(data))

    assert str(error.value) == err_msg


def test_sms_sender_form_validation(
    client,
    mock_get_user_by_email,
):
    form = ServiceSmsSenderForm()

    form.sms_sender.data = "elevenchars"
    form.validate()
    assert not form.errors

    form.sms_sender.data = ""
    form.validate()
    assert "This cannot be empty" == form.errors["sms_sender"][0]

    form.sms_sender.data = "morethanelevenchars"
    form.validate()
    assert "Enter 11 characters or fewer" == form.errors["sms_sender"][0]

    form.sms_sender.data = "###########"
    form.validate()
    assert "Use letters and numbers only" == form.errors["sms_sender"][0]

    form.sms_sender.data = "333"
    form.validate()
    assert "Enter 4 characters or more" == form.errors["sms_sender"][0]

    form.sms_sender.data = "4444"
    form.validate()
    assert not form.errors

    form.sms_sender.data = "00111222333"
    form.validate()
    assert "Can't start with 00" == form.errors["sms_sender"][0]


@pytest.mark.parametrize(
    "trigger_data, field_data, expected_error",
    [
        # Case 1: Trigger not activated
        ("option_a", "invalid", "StopValidation"),
        ("option_a", None, "StopValidation"),
        ("option_a", "", "StopValidation"),
        # Case 2: Trigger activated, valid values
        ("trigger_value", 1000, "StopValidation"),
        ("trigger_value", 5000, "StopValidation"),
        # Case 3: Trigger actived, empty values
        ("trigger_value", None, "This cannot be empty"),
        ("trigger_value", "", "This cannot be empty"),
        # Case 4: Trigger actived, values not within min and max
        ("trigger_value", 999, "Number must be more than 1,000"),
        ("trigger_value", 5001, "Number must be less than 5,000"),
    ],
)
def test_optional_integer_range_validation(trigger_data, field_data, expected_error, mocker):
    # Mock locale
    mocker.patch("app.get_current_locale", return_value="en")

    # Form mock with trigger field
    form = Mock()
    form.trigger_field = Mock(data=trigger_data)

    # Integer field mock
    field = Mock(data=field_data)
    field.errors = []

    # Init validator
    validator = OptionalIntegerRange(
        trigger_field="trigger_field",
        trigger_value="trigger_value",
        min=1000,
        max=5000,
    )

    if expected_error:
        # Test when we expect an error
        if expected_error == "StopValidation":
            with pytest.raises(StopValidation):
                validator(form, field)
        else:
            with pytest.raises(ValidationError) as error:
                validator(form, field)
            assert str(error.value) == expected_error
    else:
        # Test when we expect no error
        validator(form, field)
        assert field.errors == []


def test_optional_integer_range_custom_message():
    form = Mock()
    form.trigger_field = Mock(data="trigger_value")
    field = Mock(data=None)

    validator = OptionalIntegerRange(
        trigger_field="trigger_field",
        trigger_value="trigger_value",
        message="Custom error message",
    )

    with pytest.raises(ValidationError) as exc:
        validator(form, field)
    assert str(exc.value) == "Custom error message"


class TestIsLocalhostUrl:
    @pytest.mark.parametrize(
        "url",
        [
            "https://localhost/callback",
            "https://localhost:8080/callback",
            "https://localhost./callback",
            "https://127.0.0.1/callback",
            "https://127.0.0.1:443/callback",
            "https://127.0.0.2/callback",
            "https://127.255.255.255/callback",
            "https://[::1]/callback",
            "https://[0:0:0:0:0:0:0:1]/callback",
            "http://localhost/callback",
            "https://sub.localhost/path",
        ],
    )
    def test_detects_localhost_urls(self, url):
        assert _is_localhost_url(url) is True

    @pytest.mark.parametrize(
        "url",
        [
            "https://example.com/callback",
            "https://my-service.gc.ca/callback",
            "https://notlocalhost.com/callback",
        ],
    )
    def test_allows_non_localhost_urls(self, url):
        assert _is_localhost_url(url) is False


class TestFromHeaderLength:
    SENDING_DOMAIN = "notify.example.com"
    # Example from notification-api issue #3494
    ISSUE_NAME = (
        "Accès et mise à jour des renseignements relatifs à la paye des fonctionnaires fédéraux, "
        "mesures à prendre en cas de problèmes de paye, changements dans les situations de travail "
        "et votre paye, nouvelles"
    )

    @staticmethod
    def api_from_header(service_name, email_from, sending_domain):
        # Mirrors get_from_address in notification-api app/delivery/send_to_providers.py
        encoded = base64.b64encode(service_name.encode()).decode("utf-8")
        return f'"=?utf-8?B?{encoded}?=" <{email_from}@{sending_domain}>'

    @pytest.mark.parametrize(
        "service_name, email_from",
        [
            ("Sample service", "sample.service"),
            ("a" * 200, "b" * 64),
            ("é" * 100, "abc"),
            (ISSUE_NAME, "acces_et_mise_a_jour"),
            ("Service ’ – €", "x"),
        ],
    )
    def test_get_from_header_length_matches_the_api(self, service_name, email_from):
        expected = len(self.api_from_header(service_name, email_from, self.SENDING_DOMAIN))
        assert get_from_header_length(service_name, email_from, self.SENDING_DOMAIN) == expected

    def test_issue_example_is_too_long(self):
        assert is_from_header_too_long(self.ISSUE_NAME, "acces_et_mise_a_jour", self.SENDING_DOMAIN)

    @pytest.mark.parametrize(
        "service_name",
        ["a" * 250, "é" * 125, ISSUE_NAME, "a" * 150 + "é" * 50],
    )
    def test_characters_to_remove_from_name_is_exact(self, service_name):
        email_from = "acces_et_mise_a_jour"
        to_remove = characters_to_remove_from_name(service_name, email_from, self.SENDING_DOMAIN)

        # Removing that many plain characters is enough, one fewer is not
        name_bytes = len(service_name.encode("utf-8"))
        assert not is_from_header_too_long("a" * (name_bytes - to_remove), email_from, self.SENDING_DOMAIN)
        assert is_from_header_too_long("a" * (name_bytes - to_remove + 1), email_from, self.SENDING_DOMAIN)

    def test_characters_to_remove_from_name_counts_accents_as_two(self):
        email_from = "abc"
        fits = "a" * get_max_service_name_length(email_from, self.SENDING_DOMAIN)
        assert characters_to_remove_from_name(fits, email_from, self.SENDING_DOMAIN) == 0
        assert characters_to_remove_from_name(fits + "a", email_from, self.SENDING_DOMAIN) == 1
        assert characters_to_remove_from_name(fits + "é", email_from, self.SENDING_DOMAIN) == 2

    def test_characters_to_remove_from_name_returns_none_when_email_alone_is_too_long(self):
        assert characters_to_remove_from_name("a", "b" * 300, self.SENDING_DOMAIN) is None

    def test_characters_to_remove_from_email_from_is_exact(self):
        service_name, email_from = self.ISSUE_NAME, "acces_et_mise_a_jour"
        to_remove = characters_to_remove_from_email_from(service_name, email_from, self.SENDING_DOMAIN)

        assert to_remove == get_from_header_length(service_name, email_from, self.SENDING_DOMAIN) - 320
        assert not is_from_header_too_long(service_name, email_from[:-to_remove], self.SENDING_DOMAIN)
        assert is_from_header_too_long(service_name, email_from[: -to_remove + 1], self.SENDING_DOMAIN)

    def test_characters_to_remove_from_email_from_returns_none_when_not_fixable(self):
        # The name alone is already 52 characters over, so no email address is short enough
        assert characters_to_remove_from_email_from("a" * 250, "b" * 5, self.SENDING_DOMAIN) is None

    @pytest.mark.parametrize(
        "email_from, sending_domain, expected",
        [
            # 320 - ('"=?utf-8?B?' + '?=" <' + email_from + '@' + domain + '>'), rounded down to whole base64 groups
            ("abc", "notify.example.com", 210),
            ("b" * 64, "notify.example.com", 165),
            ("abc", "a-much-longer-sending-domain.example.com", 192),
        ],
    )
    def test_get_max_service_name_length(self, email_from, sending_domain, expected):
        assert get_max_service_name_length(email_from, sending_domain) == expected
        assert not is_from_header_too_long("a" * expected, email_from, sending_domain)

    @pytest.mark.parametrize(
        "service_name, expected",
        [
            ("a" * 200, 16),
            ("é" * 100, 16),
            ("Sample service", 64),  # never more than the 64 character limit
            ("a" * 255, 0),
        ],
    )
    def test_get_max_email_from_length(self, service_name, expected):
        assert get_max_email_from_length(service_name, self.SENDING_DOMAIN) == expected


class TestValidateCombinedEmailHeaderLength:
    @staticmethod
    def form_with(**fields):
        return SimpleNamespace(**{name: SimpleNamespace(name=name, data=data) for name, data in fields.items()})

    @pytest.fixture(autouse=True)
    def fake_sending_domain(self, app_):
        with app_.test_request_context(), set_config(app_, "SENDING_DOMAIN", "notify.example.com"):
            g.current_service = None
            yield

    def test_passes_when_header_fits(self):
        form = self.form_with(name="Sample service", email_from="sample.service")
        validate_combined_email_header_length(form, form.name)
        validate_combined_email_header_length(form, form.email_from)

    def test_errors_are_field_specific(self):
        # '"=?utf-8?B?' (11) + 268 + '?=" <' (5) + 20 + '@' + 'notify.example.com' (18) + '>' = 324
        form = self.form_with(name="a" * 200, email_from="b" * 20)

        with pytest.raises(ValidationError) as name_error:
            validate_combined_email_header_length(form, form.name)
        with pytest.raises(ValidationError) as email_error:
            validate_combined_email_header_length(form, form.email_from)

        assert str(name_error.value) == (
            "Your service name and email address are too long together. Remove 2 characters from the service name. "
            "Letters with accents, like é, count as 2 characters."
        )
        assert str(email_error.value) == (
            "Your service name and email address are too long together. Remove 4 characters from the email address."
        )

    def test_email_field_asks_for_shorter_name_when_email_alone_cant_fix_it(self):
        form = self.form_with(name="a" * 250, email_from="b" * 5)

        with pytest.raises(ValidationError) as email_error:
            validate_combined_email_header_length(form, form.email_from)

        assert "Remove 43 characters from the service name." in str(email_error.value)

    def test_uses_current_service_email_from_and_sending_domain(self):
        g.current_service = SimpleNamespace(
            name="Current service", email_from="b" * 20, sending_domain="a-much-longer-sending-domain.example.com"
        )
        form = self.form_with(name="a" * 190)

        with pytest.raises(ValidationError) as e:
            validate_combined_email_header_length(form, form.name)

        assert "Remove 10 characters from the service name." in str(e.value)

    def test_uses_current_service_name_when_only_email_from_is_on_the_form(self):
        g.current_service = SimpleNamespace(name="a" * 200, email_from="old", sending_domain=None)
        form = self.form_with(email_from="b" * 20)

        with pytest.raises(ValidationError) as e:
            validate_combined_email_header_length(form, form.email_from)

        assert "Remove 4 characters from the email address." in str(e.value)
