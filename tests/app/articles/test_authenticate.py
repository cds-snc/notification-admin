import requests_mock
from flask import current_app

from app import articles


def test_authenticate_success():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT
    valid_token = "this-is-a-valid-token"

    endpoint = f"https://{base_endpoint}{auth_endpoint}"

    with requests_mock.mock() as mock:
        mock.request(
            "POST",
            endpoint,
            json={"token": valid_token, "user_email": "user@example.com", "user_nicename": "user", "user_display_name": "User"},
            status_code=200,
        )

        token = articles.authenticate("user", "password", base_endpoint)
        assert token == valid_token
        assert mock.called
        assert mock.request_history[0].url == endpoint


def test_authenticate_bad_credentials():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    endpoint = f"https://{base_endpoint}{auth_endpoint}"

    with requests_mock.mock() as mock:
        mock.request(
            "POST",
            endpoint,
            json={
                "code": "jwt_auth_failed",
                "data": {
                    "status": 403
                },
                "message": "Invalid Credentials."
            },
            status_code=200,
        )

        token = articles.authenticate("user", "bad_password", base_endpoint)
        assert token == None
        assert mock.called
        assert mock.request_history[0].url == endpoint
