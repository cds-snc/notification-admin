import requests_mock
from app import articles
from flask import current_app

def test_validate_token_valid():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    endpoint = f"https://{base_endpoint}{auth_endpoint}/validate"

    with requests_mock.mock() as mock:
        mock.request(
            "POST",
            endpoint,
            json={
                "code": "jwt_auth_valid_token",
                "data": {
                    "status": 200
                }
            },
            status_code=200
        )

        valid = articles.validate_token('valid-token')
        assert valid == True
        assert mock.called
        assert mock.request_history[0].url == endpoint

def test_validate_token_bad_token():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    endpoint = f"https://{base_endpoint}{auth_endpoint}/validate"

    with requests_mock.mock() as mock:
        mock.request(
            "POST",
            endpoint,
            json={
                "code": "jwt_auth_invalid_token",
                "message": "Signature verification failed",
                "data": {
                    "status": 403
                }
            },
            status_code=403
        )

        valid = articles.validate_token('bad-token')
        assert valid == False
        assert mock.called
        assert mock.request_history[0].url == endpoint

def test_validate_token_expired_token():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    endpoint = f"https://{base_endpoint}{auth_endpoint}/validate"

    with requests_mock.mock() as mock:
        mock.request(
            "POST",
            endpoint,
            json={
                "code": "jwt_auth_invalid_token",
                "message": "Expired token",
                "data": {
                    "status": 403
                }
            },
            status_code=403
        )

        valid = articles.validate_token('expired-token')
        assert valid == False
        assert mock.called
        assert mock.request_history[0].url == endpoint