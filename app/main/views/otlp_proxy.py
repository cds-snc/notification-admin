import os

import requests
from flask import Response, abort, current_app, request

from app import csrf
from app.main import main

OTLP_PROXY_TIMEOUT = 10
OTLP_SIGNAL_TYPES = {"metrics", "traces"}
OTLP_MAX_PAYLOAD_BYTES = 1 * 1024 * 1024  # 1 MB


@main.route("/otlp-proxy/v1/<signal_type>", methods=["POST"])
@csrf.exempt
def otlp_proxy(signal_type):
    if signal_type not in OTLP_SIGNAL_TYPES:
        abort(404)

    if not current_app.config.get("FF_ENABLE_CLIENT_SIDE_OTEL", False):
        abort(404)

    if request.content_length and request.content_length > OTLP_MAX_PAYLOAD_BYTES:
        current_app.logger.warning(f"[OTEL] OTLP proxy rejected oversized {signal_type} payload ({request.content_length} bytes)")
        abort(413)

    otlp_base_url = os.environ.get("OTLP_ENDPOINT", "").rstrip("/")
    if not otlp_base_url:
        current_app.logger.error("[OTEL] OTLP_ENDPOINT is not configured; cannot proxy telemetry")
        return Response(status=503)
    upstream_url = f"{otlp_base_url}/v1/{signal_type}"
    payload_size = len(request.get_data(cache=True))
    current_app.logger.debug(f"[OTEL] OTLP proxy received {signal_type} export request (payload_bytes={payload_size})")
    request_headers = {}

    for header_name in ("Content-Encoding", "Content-Type", "traceparent", "tracestate", "baggage"):
        header_value = request.headers.get(header_name)
        if header_value:
            request_headers[header_name] = header_value

    try:
        upstream_response = requests.post(
            upstream_url,
            data=request.get_data(cache=True),
            headers=request_headers,
            timeout=OTLP_PROXY_TIMEOUT,
        )
    except requests.RequestException:
        current_app.logger.exception(f"[OTEL] OTLP proxy request failed for {upstream_url}")
        return Response(status=502)

    current_app.logger.debug(
        f"[OTEL] OTLP proxy {signal_type} export returned {upstream_response.status_code} from {upstream_url}"
    )

    response_headers = [
        (header_name, header_value)
        for header_name, header_value in upstream_response.headers.items()
        if header_name.lower() not in {"connection", "content-length", "transfer-encoding"}
    ]
    return Response(upstream_response.content, status=upstream_response.status_code, headers=response_headers)
