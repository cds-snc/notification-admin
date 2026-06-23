import os

import requests
from flask import Response, abort, current_app, request

from app import csrf
from app.main import main

OTLP_PROXY_TIMEOUT = 10
OTLP_SIGNAL_TYPES = {"metrics", "traces"}
OTLP_SIGNAL_PATHS = {"metrics": "/v1/metrics", "traces": "/v1/traces"}
OTLP_MAX_PAYLOAD_BYTES = 1 * 1024 * 1024  # 1 MB


@main.route("/otlp-proxy/v1/<signal_type>", methods=["POST"])
@csrf.exempt
def otlp_proxy(signal_type):
    if signal_type not in OTLP_SIGNAL_TYPES:
        abort(404)

    if not current_app.config.get("ENABLE_CLIENT_SIDE_OTEL", False):
        abort(404)

    payload = request.get_data(cache=False)
    if len(payload) > OTLP_MAX_PAYLOAD_BYTES:
        current_app.logger.warning(f"[OTEL] OTLP proxy rejected oversized {signal_type} payload ({len(payload)} bytes)")
        abort(413)

    otlp_base_url = os.environ.get("OTLP_ENDPOINT", "").rstrip("/")
    if not otlp_base_url:
        current_app.logger.error("[OTEL] OTLP_ENDPOINT is not configured; cannot proxy telemetry")
        return Response(status=503)
    upstream_url = otlp_base_url + OTLP_SIGNAL_PATHS[signal_type]
    current_app.logger.debug(f"[OTEL] OTLP proxy received {signal_type} export request (payload_bytes={len(payload)})")
    request_headers = {}

    for header_name in ("Content-Encoding", "Content-Type", "traceparent", "tracestate", "baggage"):
        header_value = request.headers.get(header_name)
        if header_value:
            request_headers[header_name] = header_value

    try:
        upstream_response = requests.post(
            upstream_url,
            data=payload,
            headers=request_headers,
            timeout=OTLP_PROXY_TIMEOUT,
        )
    except requests.RequestException:
        current_app.logger.exception(f"[OTEL] OTLP proxy request failed for {upstream_url}")
        return Response(status=502)

    current_app.logger.debug(
        f"[OTEL] OTLP proxy {signal_type} export returned {upstream_response.status_code} from {upstream_url}"
    )

    return Response(status=upstream_response.status_code)
