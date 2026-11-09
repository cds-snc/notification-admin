from unittest.mock import Mock

from flask_wtf.csrf import CSRFError
from itsdangerous import SignatureExpired, URLSafeTimedSerializer


def _make_otel_signed_token(app, nonce="test-nonce"):
    return URLSafeTimedSerializer(app.config["SECRET_KEY"]).dumps(nonce, salt="otel-proxy")


def _setup_otel(client, mocker):
    upstream_response = Mock(status_code=202, content=b"ok", headers={"Content-Type": "text/plain"})
    post_mock = mocker.patch("app.main.views.otlp_proxy.requests.post", return_value=upstream_response)
    mocker.patch.dict("os.environ", {"OTLP_ENDPOINT": "https://otlp-collector.signoz.svc.cluster.local:4318/"})
    client.application.config["ENABLE_CLIENT_SIDE_OTEL"] = True
    return post_mock


# --- unauthenticated (signed token) ---


def test_otlp_proxy_forwards_trace_payload_to_upstream(client, mocker):
    post_mock = _setup_otel(client, mocker)
    token = _make_otel_signed_token(client.application)

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "X-OTEL-Token": token},
    )

    assert response.status_code == 202
    assert response.data == b""
    post_mock.assert_called_once_with(
        "https://otlp-collector.signoz.svc.cluster.local:4318/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json"},
        timeout=10,
    )


def test_otlp_proxy_forwards_traceparent_header(client, mocker):
    post_mock = _setup_otel(client, mocker)
    token = _make_otel_signed_token(client.application)

    traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "traceparent": traceparent, "X-OTEL-Token": token},
    )

    assert response.status_code == 202
    post_mock.assert_called_once_with(
        "https://otlp-collector.signoz.svc.cluster.local:4318/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "traceparent": traceparent},
        timeout=10,
    )


def test_otlp_proxy_rejects_unauthenticated_request_with_no_token(client, mocker):
    _setup_otel(client, mocker)

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401


def test_otlp_proxy_rejects_unauthenticated_request_with_invalid_token(client, mocker):
    _setup_otel(client, mocker)

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "X-OTEL-Token": "not-a-valid-token"},
    )

    assert response.status_code == 401


def test_otlp_proxy_rejects_unauthenticated_request_with_expired_token(client, mocker):
    _setup_otel(client, mocker)
    mock_serializer = mocker.patch("app.main.views.otlp_proxy.URLSafeTimedSerializer")
    mock_serializer.return_value.loads.side_effect = SignatureExpired("Token expired")

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "X-OTEL-Token": "some.expired.token"},
    )

    assert response.status_code == 401


# --- authenticated (CSRF token) ---


def test_otlp_proxy_accepts_authenticated_request_with_valid_csrf(logged_in_client, mocker):
    post_mock = _setup_otel(logged_in_client, mocker)
    mocker.patch("app.main.views.otlp_proxy.validate_csrf")

    response = logged_in_client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "X-CSRFToken": "valid-csrf-token"},
    )

    assert response.status_code == 202
    post_mock.assert_called_once()


def test_otlp_proxy_rejects_authenticated_request_with_invalid_csrf(logged_in_client, mocker):
    _setup_otel(logged_in_client, mocker)
    mocker.patch("app.main.views.otlp_proxy.validate_csrf", side_effect=CSRFError("Bad token"))

    response = logged_in_client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "X-CSRFToken": "bad-token"},
    )

    assert response.status_code == 403


# --- feature flag / routing ---


def test_otlp_proxy_returns_404_when_client_side_otel_disabled(client):
    client.application.config["ENABLE_CLIENT_SIDE_OTEL"] = False

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 404


def test_otlp_proxy_rejects_unknown_signal_type(client):
    response = client.post("/otlp-proxy/v1/logs", data=b"{}")

    assert response.status_code == 404
