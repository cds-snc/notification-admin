import importlib
import os
from unittest import mock

import pytest

from app import config


def cf_conf():
    os.environ["API_HOST_NAME"] = "cf"


@pytest.fixture
def reload_config():
    """
    Reset config, by simply re-running config.py from a fresh environment
    """
    old_env = os.environ.copy()

    yield

    os.environ = old_env
    importlib.reload(config)


def test_load_cloudfoundry_config_if_available(monkeypatch, reload_config):
    os.environ["API_HOST_NAME"] = "env"
    monkeypatch.setenv("VCAP_APPLICATION", "some json blob")

    with mock.patch("app.cloudfoundry_config.extract_cloudfoundry_config", side_effect=cf_conf) as cf_config:
        # reload config so that its module level code (ie: all of it) is re-instantiated
        importlib.reload(config)

    assert cf_config.called

    assert os.environ["API_HOST_NAME"] == "cf"
    assert config.Config.API_HOST_NAME == "cf"


def test_load_config_if_cloudfoundry_not_available(monkeypatch, reload_config):
    os.environ["API_HOST_NAME"] = "env"

    monkeypatch.delenv("VCAP_APPLICATION", raising=False)

    with mock.patch("app.cloudfoundry_config.extract_cloudfoundry_config") as cf_config:
        # reload config so that its module level code (ie: all of it) is re-instantiated
        importlib.reload(config)

    assert not cf_config.called

    assert os.environ["API_HOST_NAME"] == "env"
    assert config.Config.API_HOST_NAME == "env"


def test_get_config(reload_config):
    config.Config.API_HOST_NAME = "http://foo.bar"
    config.Config.NOTIFY_USER_ID = "bueller"
    logged_config = config.Config.get_config([])
    assert logged_config["API_HOST_NAME"] == "http://foo.bar"
    assert logged_config["NOTIFY_USER_ID"] == "bueller"

    config.Config.SECRET_KEY = "1234"
    logged_config = config.Config.get_config(["SECRET_KEY"])
    assert logged_config["SECRET_KEY"] == "***"

    for key, _ in logged_config.items():
        assert not key.startswith("__")
        assert not callable(getattr(config.Config, key))


def test_get_safe_config(mocker, reload_config):
    mock_get_config = mocker.patch("app.config.Config.get_config")
    mock_get_sensitive_config = mocker.patch("app.config.Config.get_sensitive_config")

    config.Config.get_safe_config()
    assert mock_get_config.called
    assert mock_get_sensitive_config.called


def test_get_sensitive_config():
    sensitive_config = config.Config.get_sensitive_config()
    assert sensitive_config
    for key in sensitive_config:
        assert key
