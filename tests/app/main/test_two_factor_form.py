import pytest

from app import user_api_client
from app.main.forms import TwoFactorForm


def _check_code(code):
    return user_api_client.check_verify_code("1", code, "sms")


@pytest.mark.parametrize(
    "post_data",
    [
        {"two_factor_code": "12345"},
        {"two_factor_code": " 12345 "},
    ],
)
def test_form_is_valid_returns_no_errors(
    app_,
    mock_check_verify_code,
    post_data,
):
    with app_.test_request_context(method="POST", data=post_data):
        form = TwoFactorForm(_check_code)
        assert form.validate() is True
        assert form.errors == {}


@pytest.mark.parametrize(
    "type, post_data, expected_error",
    (
        (
            "verify_code",
            {"two_factor_code": "1234"},
            "Not enough numbers",
        ),
        (
            "verify_code",
            {"two_factor_code": "123456"},
            "Too many numbers",
        ),
        (
            "verify_code",
            {},
            "This cannot be empty",
        ),
        (
            "verify_code",
            {"two_factor_code": "12E45"},
            "Numbers only",
        ),
        (
            "code_expired",
            {"two_factor_code": "99999"},
            "That security code has expired",
        ),
        (
            "code_not_found",
            {"two_factor_code": "99999"},
            "Code not found",
        ),
    ),
)
def test_returns_errors_when_code_is_too_short(
    app_,
    mocker,
    type,
    post_data,
    expected_error,
):
    if type == "verify_code":
        _verify = True, ""
    if type == "code_expired":
        _verify = False, "That security code has expired"
    if type == "code_not_found":
        _verify = False, "Code not found"

    mocker.patch("app.user_api_client.check_verify_code", return_value=_verify)

    with app_.test_request_context(method="POST", data=post_data):
        form = TwoFactorForm(_check_code)
        assert form.validate() is False
        assert form.errors == {"two_factor_code": [expected_error]}
