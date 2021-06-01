import pytest

from app.main.forms import get_placeholder_form_instance


def test_form_class_not_mutated(app_):

    with app_.test_request_context(method="POST", data={"placeholder_value": ""}):
        form1 = get_placeholder_form_instance(
            "name", {}, "sms", optional_placeholder=False
        )
        form2 = get_placeholder_form_instance(
            "city", {}, "sms", optional_placeholder=True
        )

        assert not form1.validate_on_submit()
        assert form2.validate_on_submit()

        assert (
            str(form1.placeholder_value.label)
            == '<label for="placeholder_value">name</label>'
        )
        assert (
            str(form2.placeholder_value.label)
            == '<label for="placeholder_value">city</label>'
        )


@pytest.mark.parametrize(
    "service_can_send_international_sms, placeholder_name, template_type, value, expected_error",
    [
        (False, "email address", "email", "", "This cannot be empty"),
        (False, "email address", "email", "12345", "Enter a valid email address"),
        (
            False,
            "email address",
            "email",
            "“bad”@email-address.com",
            "Enter a valid email address",
        ),
        (False, "email address", "email", "test+'éüî@example.com", None),
        (False, "email address", "email", "Tom!the#taglover?@mailinator.com", None),
        (False, "email address", "email", "Jean-o'briån@mailinator.com", None),
        (False, "email address", "email", "Tom!the#taglover?@mailinator.com", None),
        (False, "email address", "email", "2+2={5*4/5}@mailinator.com", None),
        (False, "email address", "email", "test@example.com", None),
        (False, "email address", "email", "test@tbs-sct.gc.ca", None),
        (False, "phone number", "sms", "", "This cannot be empty"),
        (False, "phone number", "sms", "+4966921809", "Not a valid phone number"),
        (False, "phone number", "sms", "6502532222", None),
        (False, "phone number", "sms", "+16502532222", None),
        (True, "phone number", "sms", "+123", "Not a valid phone number"),
        (True, "phone number", "sms", "+16502532222", None),
        (True, "phone number", "sms", "+4966921809", None),
        (False, "anything else", "sms", "", "This cannot be empty"),
        (False, "anything else", "email", "", "This cannot be empty"),
        (True, "phone number", "sms", "invalid", "Not a valid phone number"),
        (True, "phone number", "email", "invalid", None),
        (True, "phone number", "letter", "invalid", None),
        (True, "email address", "sms", "invalid", None),
    ],
)
def test_validates_recipients(
    app_,
    placeholder_name,
    template_type,
    value,
    service_can_send_international_sms,
    expected_error,
):
    with app_.test_request_context(method="POST", data={"placeholder_value": value}):
        form = get_placeholder_form_instance(
            placeholder_name,
            {},
            template_type,
            allow_international_phone_numbers=service_can_send_international_sms,
        )

        if expected_error:
            assert not form.validate_on_submit()
            assert form.placeholder_value.errors[0] == expected_error
        else:
            assert form.validate_on_submit()
