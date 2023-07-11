import pytest
from flask import url_for

from tests.conftest import set_config


def test_debug_triggers_exception(mocker, client, app_):
    with set_config(app_, "DEBUG_KEY", "debug"):
        with pytest.raises(Exception):
            client.get(url_for("status.debug", key="debug"))


def test_debug_no_config_key_returns_404(
    mocker,
    client,
    app_,
):
    with set_config(app_, "DEBUG_KEY", ""):
        response = client.get(url_for("status.debug", key=""))
        assert response.status_code == 404


def test_debug_no_key_returns_404(mocker, client):
    response = client.get(url_for("status.debug"))
    assert response.status_code == 404


def test_debug_wrong_key_returns_404(
    mocker,
    client,
    app_,
):
    with set_config(app_, "DEBUG_KEY", "debug"):
        response = client.get(url_for("status.debug", key="wrong-key"))
        assert response.status_code == 404
