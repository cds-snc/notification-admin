import pytest
from flask import Flask, render_template_string


@pytest.fixture
def app():
    """Create a Flask app with proper template configuration"""
    app = Flask(__name__, template_folder="/workspace/app/templates")
    return app


def test_render_test_codes_in_dev_renders_when_all_conditions_met(app):
    """Test that the macro renders the hidden input when all conditions are met"""
    app.config["NOTIFY_ENVIRONMENT"] = "development"

    with app.test_request_context("/", base_url="http://localhost:6012"):
        with app.app_context():
            result = render_template_string(
                """
                {% from 'components/render_test_codes_in_dev.html' import render_test_codes_in_dev %}
                {{ render_test_codes_in_dev("123456") }}
                """
            )
            assert '<input type="hidden" data-testid="auth_key" value="123456">' in result


def test_render_test_codes_in_dev_renders_nothing_when_no_key(app):
    """Test that the macro renders nothing when no key is provided"""
    app.config["NOTIFY_ENVIRONMENT"] = "development"

    with app.test_request_context("/", base_url="http://localhost:6012"):
        with app.app_context():
            result = render_template_string(
                """
                {% from 'components/render_test_codes_in_dev.html' import render_test_codes_in_dev %}
                {{ render_test_codes_in_dev(None) }}
                """
            ).strip()
            assert result == ""


def test_render_test_codes_in_dev_renders_nothing_when_empty_key(app):
    """Test that the macro renders nothing when empty key is provided"""
    app.config["NOTIFY_ENVIRONMENT"] = "development"

    with app.test_request_context("/", base_url="http://localhost:6012"):
        with app.app_context():
            result = render_template_string(
                """
                {% from 'components/render_test_codes_in_dev.html' import render_test_codes_in_dev %}
                {{ render_test_codes_in_dev("") }}
                """
            ).strip()
            assert result == ""


def test_render_test_codes_in_dev_renders_nothing_when_not_development(app):
    """Test that the macro renders nothing when not in development environment"""
    app.config["NOTIFY_ENVIRONMENT"] = "production"

    with app.test_request_context("/", base_url="http://localhost:6012"):
        with app.app_context():
            result = render_template_string(
                """
                {% from 'components/render_test_codes_in_dev.html' import render_test_codes_in_dev %}
                {{ render_test_codes_in_dev("123456") }}
                """
            ).strip()
            assert result == ""


def test_render_test_codes_in_dev_renders_nothing_when_notify_domain(app):
    """Test that the macro renders nothing when host contains notification.canada.ca"""
    app.config["NOTIFY_ENVIRONMENT"] = "development"

    with app.test_request_context("/", base_url="https://notification.canada.ca"):
        with app.app_context():
            result = render_template_string(
                """
                {% from 'components/render_test_codes_in_dev.html' import render_test_codes_in_dev %}
                {{ render_test_codes_in_dev("123456") }}
                """
            ).strip()
            assert result == ""


@pytest.mark.parametrize(
    "environment,host,key,expected",
    [
        ("development", "localhost:6012", "123456", True),
        ("production", "localhost:6012", "123456", False),
        ("development", "notification.canada.ca", "123456", False),
        ("development", "localhost:6012", None, False),
    ],
)
def test_render_test_codes_in_dev_parameterized(app, environment, host, key, expected):
    """Parameterized test covering all combinations of conditions"""
    app.config["NOTIFY_ENVIRONMENT"] = environment

    with app.test_request_context("/", base_url=f"http://{host}"):
        with app.app_context():
            result = render_template_string(
                """
                {% from 'components/render_test_codes_in_dev.html' import render_test_codes_in_dev %}
                {{ render_test_codes_in_dev(key) }}
                """,
                key=key,
            ).strip()
            if expected:
                assert f'<input type="hidden" data-testid="auth_key" value="{key}">' in result
            else:
                assert result == ""
