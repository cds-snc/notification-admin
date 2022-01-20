import requests_mock
from flask import current_app

from app import articles


def test_validate_token_valid():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    token = "this-is-a-valid-token"
    endpoint = f"https://{base_endpoint}{auth_endpoint}/validate"
    request_headers = {"Authorization": "Bearer {}".format(token)}
    response_json = {"code": "jwt_auth_valid_token", "data": {"status": 200}}

    with requests_mock.mock() as mock:
        mock.request("POST", endpoint, json=response_json, status_code=200, request_headers=request_headers)

        valid = articles.validate_token(token)
        assert valid is True
        assert mock.called
        assert mock.request_history[0].url == endpoint


def test_validate_token_bad_token():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    token = "this-is-a-bad-token"
    endpoint = f"https://{base_endpoint}{auth_endpoint}/validate"
    request_headers = {"Authorization": "Bearer {}".format(token)}
    response_json = {"code": "jwt_auth_invalid_token", "message": "Signature verification failed", "data": {"status": 403}}

    with requests_mock.mock() as mock:
        mock.request("POST", endpoint, json=response_json, status_code=403, request_headers=request_headers)

        valid = articles.validate_token(token)
        assert valid is False
        assert mock.called
        assert mock.request_history[0].url == endpoint


def test_validate_token_expired_token():
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    auth_endpoint = articles.GC_ARTICLES_AUTH_API_ENDPOINT

    token = "this-is-an-expired-token"
    endpoint = f"https://{base_endpoint}{auth_endpoint}/validate"
    request_headers = {"Authorization": "Bearer {}".format(token)}
    response_json = {"code": "jwt_auth_invalid_token", "message": "Expired token", "data": {"status": 403}}

    with requests_mock.mock() as mock:
        mock.request("POST", endpoint, json=response_json, status_code=403, request_headers=request_headers)

        valid = articles.validate_token(token)
        assert valid is False
        assert mock.called
        assert mock.request_history[0].url == endpoint
