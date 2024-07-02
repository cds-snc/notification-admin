import pytest
from flask import url_for
from tests.conftest import set_config_values


def test_debug_triggers_exception(client, app_):
    with set_config_values(app_, {"ALLOW_DEBUG_ROUTE": True, "DEBUG_KEY": "debug"}):
        with pytest.raises(Exception):
            client.get(url_for("status.debug", key="debug"))


def test_ALLOW_DEBUG_ROUTE_False_returns_404(client, app_):
    with set_config_values(app_, {"ALLOW_DEBUG_ROUTE": False, "DEBUG_KEY": "debug"}):
        response = client.get(url_for("status.debug", key="debug"))
        assert response.status_code == 404


def test_no_config_key_returns_404(client, app_):
    with set_config_values(app_, {"ALLOW_DEBUG_ROUTE": True, "DEBUG_KEY": ""}):
        response = client.get(url_for("status.debug", key=""))
        assert response.status_code == 404


def test_no_key_returns_404(client, app_):
    with set_config_values(app_, {"ALLOW_DEBUG_ROUTE": True, "DEBUG_KEY": "debug"}):
        response = client.get(url_for("status.debug"))
        assert response.status_code == 404


def test_wrong_key_returns_404(client, app_):
    with set_config_values(app_, {"ALLOW_DEBUG_ROUTE": True, "DEBUG_KEY": "debug"}):
        response = client.get(url_for("status.debug", key="wrong-key"))
        assert response.status_code == 404
