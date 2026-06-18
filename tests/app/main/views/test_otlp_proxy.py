from unittest.mock import Mock


def test_otlp_proxy_forwards_trace_payload_to_upstream(client, mocker):
    upstream_response = Mock(status_code=202, content=b"ok", headers={"Content-Type": "text/plain"})
    post_mock = mocker.patch("app.main.views.otlp_proxy.requests.post", return_value=upstream_response)
    mocker.patch.dict("os.environ", {"OTLP_ENDPOINT": "https://otlp-collector.signoz.svc.cluster.local:4318/"})
    client.application.config["FF_ENABLE_CLIENT_SIDE_OTEL"] = True

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 202
    assert response.data == b"ok"
    post_mock.assert_called_once_with(
        "https://otlp-collector.signoz.svc.cluster.local:4318/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json"},
        timeout=10,
    )


def test_otlp_proxy_forwards_traceparent_header(client, mocker):
    upstream_response = Mock(status_code=202, content=b"ok", headers={"Content-Type": "text/plain"})
    post_mock = mocker.patch("app.main.views.otlp_proxy.requests.post", return_value=upstream_response)
    mocker.patch.dict("os.environ", {"OTLP_ENDPOINT": "https://otlp-collector.signoz.svc.cluster.local:4318/"})
    client.application.config["FF_ENABLE_CLIENT_SIDE_OTEL"] = True

    traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "traceparent": traceparent},
    )

    assert response.status_code == 202
    post_mock.assert_called_once_with(
        "https://otlp-collector.signoz.svc.cluster.local:4318/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json", "traceparent": traceparent},
        timeout=10,
    )


def test_otlp_proxy_returns_404_when_client_side_otel_disabled(client):
    client.application.config["FF_ENABLE_CLIENT_SIDE_OTEL"] = False

    response = client.post(
        "/otlp-proxy/v1/traces",
        data=b'{"resourceSpans":[]}',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 404


def test_otlp_proxy_rejects_unknown_signal_type(client):
    response = client.post("/otlp-proxy/v1/logs", data=b"{}")

    assert response.status_code == 404
