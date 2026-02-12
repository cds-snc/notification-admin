"""Custom gevent worker that plays nicely with OpenTelemetry auto-instrumentation."""

import os

from gunicorn.workers.ggevent import GeventWorker  # type: ignore


class OTelAwareGeventWorker(GeventWorker):
    """
    Custom gevent worker that conditionally patches modules based on OpenTelemetry presence.

    When OpenTelemetry auto-instrumentation is active, it patches SSL and urllib3 before
    gunicorn workers start. We need to avoid re-patching these to prevent recursion errors.
    """

    def patch(self):
        """Patch gevent with awareness of OpenTelemetry instrumentation."""
        from gevent import monkey  # type: ignore

        # Check if OpenTelemetry is enabled via feature flag
        enable_otel = os.getenv("FF_ENABLE_OTEL", "False").lower() == "true"

        if enable_otel:
            # OpenTelemetry is active - avoid patching SSL which OTel already patched
            monkey.patch_all(ssl=False)
        else:
            # No OpenTelemetry - patch everything normally
            monkey.patch_all()
