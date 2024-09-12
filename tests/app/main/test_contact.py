import pytest
from flask import url_for
from flask_login import current_user

from tests.conftest import normalize_spaces


def assert_no_back_link(page):
    assert len(page.select(".back-link")) == 0


def assert_has_back_link(page):
    assert len(page.select(".back-link")) == 1


def test_contact_page_does_not_require_login(client_request):
    client_request.logout()
    client_request.get(".contact")


def test_identity_step_logged_in(client_request, mocker):
    mock_send_contact_request = mocker.patch("app.user_api_client.send_contact_request")

    # No name or email address fields are present
    page = client_request.get(
        ".contact",
        _expected_status=200,
    )

    assert set(input["name"] for input in page.select("input")) == set(["support_type", "csrf_token"])

    # Select a contact reason and submit the form
    page = client_request.post(".contact", _expected_status=200, _follow_redirects=True, _data={"support_type": "other"})

    # On step 2, to type a message
    assert_has_back_link(page)
    assert page.select_one(".back-link")["href"] == url_for(".contact")
    assert normalize_spaces(page.find("h1").text) == "Tell us more"

    # Message step
    page = client_request.post("main.message", _expected_status=200, _data={"message": "My message"})

    # Contact email has been sent
    assert_no_back_link(page)
    assert normalize_spaces(page.find("h1").text) == "Thank you for contacting us"
    mock_send_contact_request.assert_called_once()


def test_identity_step_validates(client_request):
    client_request.logout()

    page = client_request.post(
        ".contact",
        _expected_status=200,
        _data={"name": "", "email_address": "foo", "support_type": ""},
    )

    assert [(error["data-error-label"], normalize_spaces(error.text)) for error in page.select(".error-message")] == [
        ("name", "Enter your name"),
        ("email_address", "Enter a valid email address"),
        ("support_type", "You need to choose an option"),
    ]
    assert_no_back_link(page)


def test_back_link_goes_to_previous_step(client_request):
    client_request.logout()

    page = client_request.post(
        ".contact",
        _expected_status=200,
        _follow_redirects=True,
        _data={
            "name": "John",
            "email_address": "john@example.com",
            "support_type": "other",
        },
    )

    assert page.select_one(".back-link")["href"] == url_for(".contact")

    page = client_request.get_url(page.select_one(".back-link")["href"], _test_page_title=False)

    # Fields have been saved and are filled
    assert page.select_one("input[checked]")["value"] == "other"
    assert [(input["name"], input["value"]) for input in page.select("input") if input["name"] in ["name", "email_address"]] == [
        ("name", "John"),
        ("email_address", "john@example.com"),
    ]


@pytest.mark.parametrize("support_type", ["ask_question", "technical_support", "give_feedback", "other"])
def test_message_step_validates(client_request, support_type, mocker):
    mock_send_contact_request = mocker.patch("app.user_api_client.send_contact_request")

    page = client_request.post(
        ".contact",
        _expected_status=200,
        _follow_redirects=True,
        _data={
            "name": "John",
            "email_address": "john@example.com",
            "support_type": support_type,
        },
    )

    page = client_request.post(".message", _expected_status=200, _follow_redirects=True, _data={"message": ""})

    assert_has_back_link(page)

    assert [(error["data-error-label"], normalize_spaces(error.text)) for error in page.select(".error-message")] == [
        ("message", "You need to enter something if you want to contact us")
    ]

    mock_send_contact_request.assert_not_called()


def test_saves_form_to_session(client_request, mocker):
    mock_send_contact_request = mocker.patch("app.user_api_client.send_contact_request")

    data = {
        "name": "John",
        "email_address": "john@example.com",
        "support_type": "other",
    }

    client_request.logout()

    with client_request.session_transaction() as session:
        session["contact_form"] = data

    client_request.post(
        ".contact",
        _expected_status=200,
        _follow_redirects=True,
        _data=data,
    )

    # Leaving form
    client_request.get(".sign_in")

    # Going back
    page = client_request.get(".contact", _test_page_title=False)

    # Fields have been saved and are filled
    assert page.select_one("input[checked]")["value"] == "other"
    assert [(input["name"], input["value"]) for input in page.select("input") if input["name"] in ["name", "email_address"]] == [
        ("name", "John"),
        ("email_address", "john@example.com"),
    ]

    # Validating first step
    client_request.post(
        ".contact",
        _expected_status=200,
        _follow_redirects=True,
        _data={
            "name": "John",
            "email_address": "john@example.com",
            "support_type": "other",
        },
    )

    # Leaving form
    client_request.get(".sign_in")

    # Going back
    page = client_request.get(".message", _test_page_title=False)
    assert normalize_spaces(page.find("h1").text) == "Tell us more"

    # Filling a message
    data.update({"message": "My message"})
    page = client_request.post(".message", _expected_status=200, _follow_redirects=True, _data=data)

    assert_no_back_link(page)
    assert normalize_spaces(page.find("h1").text) == "Thank you for contacting us"

    mock_send_contact_request.assert_called_once()

    # Going back
    page = client_request.get(".contact", _test_page_title=False)

    # Fields are blank
    assert page.select_one("input[checked]") is None
    assert [(input["name"], input["value"]) for input in page.select("input") if input["name"] in ["name", "email_address"]] == [
        ("name", ""),
        ("email_address", ""),
    ]


@pytest.mark.parametrize(
    "support_type, expected_heading, friendly_support_type",
    [
        ("ask_question", "Ask a question", "Ask a question"),
        ("technical_support", "Get technical support", "Get technical support"),
        ("give_feedback", "Give feedback", "Give feedback"),
        ("other", "Tell us more", "Other"),
    ],
)
def test_all_reasons_message_step_success(
    client_request,
    mocker,
    support_type,
    expected_heading,
    friendly_support_type,
):
    mock_send_contact_request = mocker.patch("app.user_api_client.send_contact_request")

    page = client_request.post(
        ".contact",
        _expected_status=200,
        _follow_redirects=True,
        _data={
            "name": "John",
            "support_type": support_type,
            "email_address": "john@example.com",
        },
    )

    assert_has_back_link(page)
    assert normalize_spaces(page.find("h1").text) == expected_heading

    message = "This is my message"
    page = client_request.post(".message", _expected_status=200, _data={"message": message})

    assert_no_back_link(page)
    assert normalize_spaces(page.find("h1").text) == "Thank you for contacting us"

    profile = url_for(".user_information", user_id=current_user.id, _external=True)

    mock_send_contact_request.assert_called_once_with(
        {
            "message": message,
            "name": "John",
            "support_type": support_type,
            "email_address": "john@example.com",
            "user_profile": profile,
            "friendly_support_type": friendly_support_type,
        }
    )
