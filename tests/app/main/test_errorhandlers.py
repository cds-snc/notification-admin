import pytest
from bs4 import BeautifulSoup
from flask import Response, url_for
from flask_wtf.csrf import CSRFError
from notifications_python_client.errors import HTTPError


def test_bad_url_returns_page_not_found(client, mock_GCA_404):
    response = client.get("/bad_url")
    assert response.status_code == 404
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.string.strip() == "Page could not be found"


def test_load_service_before_request_handles_404(client_request, mocker):
    exc = HTTPError(Response(status=404), "Not found")
    get_service = mocker.patch("app.service_api_client.get_service", side_effect=exc)

    client_request.get(
        "main.service_dashboard",
        service_id="00000000-0000-0000-0000-000000000000",
        _expected_status=404,
    )

    get_service.assert_called_once_with("00000000-0000-0000-0000-000000000000")


@pytest.mark.parametrize(
    "url",
    [
        "/new-password/MALFORMED_TOKEN",
        "/user-profile/email/confirm/MALFORMED_TOKEN",
        "/verify-email/MALFORMED_TOKEN",
    ],
)
def test_malformed_token_returns_page_not_found(logged_in_client, url):
    response = logged_in_client.get(url)

    assert response.status_code == 404
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.string.strip() == "Page could not be found"
    flash_banner = page.find("div", class_="banner-dangerous").string.strip()
    assert flash_banner == "There’s something wrong with the link you’ve used."


def test_csrf_returns_400(logged_in_client, mocker):
    # we turn off CSRF handling for tests, so fake a CSRF response here.
    csrf_err = CSRFError("400 Bad Request: The CSRF tokens do not match.")
    mocker.patch("app.main.views.index.render_template", side_effect=csrf_err)

    response = logged_in_client.get("/welcome")

    assert response.status_code == 400
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.string.strip() == "Something went wrong, please go back and try again."


def test_csrf_redirects_to_sign_in_page_if_not_signed_in(client, mocker):
    csrf_err = CSRFError("400 Bad Request: The CSRF tokens do not match.")
    mocker.patch("app.main.views.index.render_template", side_effect=csrf_err)

    response = client.get("/accounts")

    assert response.status_code == 302
    assert response.location == url_for("main.sign_in", next="/accounts")


@pytest.mark.parametrize(
    "api_body, expected_heading",
    [
        ({"error": "No security keys registered"}, "Bad Request"),
        ({"errors": [{"error": "BadRequest", "message": "oops"}]}, "Bad Request"),
        ({"message": "Some error"}, "Some error"),
        ({"message": {"name": "Name is required"}}, "Name is required"),
    ],
)
def test_api_400_errors_render_400_page_regardless_of_message_shape(client_request, mocker, api_body, expected_heading):
    response = mocker.Mock(status_code=400, url="http://api/user/1/fido2_keys/authenticate")
    response.json.return_value = api_body
    mocker.patch(
        "app.user_api_client.authenticate_security_keys",
        side_effect=HTTPError(response),
    )

    page = client_request.post("main.user_profile_authenticate_security_keys", _expected_status=200)

    assert page.h1.string.strip() == expected_heading
