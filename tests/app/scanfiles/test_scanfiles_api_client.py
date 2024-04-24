from unittest import mock

import pytest
from requests.exceptions import Timeout

from app.scanfiles.scanfiles_api_client import scanfiles_api_client


@pytest.fixture
def client():
    scanfiles_api_client.init_app("http://example.com/scanfiles", "xyz")
    return scanfiles_api_client


def test_is_unsafe_returns_false_for_clean_verdict(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"verdict": "clean"}

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_true_for_suspicious_verdict(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"verdict": "suspicious"}

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is True


def test_is_unsafe_returns_true_for_malicious_verdict(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"verdict": "malicious"}

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is True


def test_is_unsafe_returns_false_for_error_verdict(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"verdict": "error"}

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_false_for_unable_to_scan_verdict(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"verdict": "unable_to_scan"}

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_false_for_unknown_verdict(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"verdict": "unknown"}

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_false_when_request_fails(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 500

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_false_for_status_code_not_200(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 400

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_false_when_url_not_set(client, app_):
    client.scanfiles_url = None
    with app_.app_context():
        result = client.is_unsafe("test.txt")

    assert result is False


def test_is_unsafe_returns_false_when_auth_token_not_set(client, app_):
    client.auth_token = None
    with app_.app_context():
        result = client.is_unsafe("test.txt")

    assert result is False


def test_is_unsafe_returns_false_when_token_not_valid(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post") as mock_post:
        mock_post.return_value.status_code = 401

        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False


def test_is_unsafe_returns_false_when_timeout_occurs(client, app_):
    with mock.patch("app.scanfiles.scanfiles_api_client.requests.post", side_effect=Timeout("RUh ROH")):
        with app_.app_context():
            result = client.is_unsafe("test.txt")

        assert result is False
