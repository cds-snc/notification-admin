import os
import sys
import time
import traceback
import uuid

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Check if OpenTelemetry auto-instrumentation is active
# If so, use sync workers to avoid monkey patching conflicts
otel_env_vars = [
    "OTEL_SERVICE_NAME",
    "OTEL_RESOURCE_ATTRIBUTES",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_TRACES_EXPORTER",
    "OTEL_METRICS_EXPORTER",
]

otel_detected = any(os.environ.get(var) for var in otel_env_vars)

# Also check if opentelemetry is in the Python path (auto-instrumentation)
pythonpath = os.environ.get("PYTHONPATH", "")
if "otel-auto-instrumentation" in pythonpath or "opentelemetry" in pythonpath:
    otel_detected = True

import gunicorn  # type: ignore
import newrelic.agent  # See https://bit.ly/2xBVKBH

environment = os.environ.get("NOTIFY_ENVIRONMENT")
newrelic.agent.initialize(environment=environment)  # noqa: E402

# Guincorn sets the server type on our app. We don't want to show it in the header in the response.
gunicorn.SERVER = "Undisclosed"

# Use sync workers when OpenTelemetry is detected to avoid SSL monkey patching conflicts
worker_class = "gevent"

# Adjust worker count based on worker class
# Sync workers need more processes to handle the same load as gevent
if otel_detected:
    workers = 8  # More workers for sync mode
else:
    workers = 5  # Standard worker count for gevent
bind = "0.0.0.0:{}".format(os.getenv("PORT"))
accesslog = "-"

# See AWS doc
# > We also recommend that you configure the idle timeout of your application
# to be larger than the idle timeout configured for the load balancer.
# > By default, Elastic Load Balancing sets the idle timeout value for your load balancer to 60 seconds.
# https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
on_aws = environment in ["production", "staging", "scratch", "dev"]
if on_aws:
    keepalive = 75

    # The default graceful timeout period for Kubernetes is 30 seconds, so
    # make sure that the timeouts defined here are less than the configured
    # Kubernetes timeout. This ensures that the gunicorn worker will exit
    # before the Kubernetes pod is terminated. This is important because
    # Kubernetes will send a SIGKILL to the pod if it does not terminate
    # within the grace period. If the worker is still processing requests
    # when it receives the SIGKILL, it will be terminated abruptly and
    # will not be able to finish processing the request. This can lead to
    # 502 errors being returned to the client.
    #
    # Also, some libraries such as NewRelic might need some time to finish
    # initialization before the worker can start processing requests. The
    # timeout values should consider these factors.
    #
    # Gunicorn config:
    # https://docs.gunicorn.org/en/stable/settings.html#graceful-timeout
    #
    # Kubernetes config:
    # https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
    graceful_timeout = 85
    timeout = 90

# Additional configuration for sync workers when using OpenTelemetry
if otel_detected:
    # Sync workers might need slightly longer timeout for instrumented requests
    timeout = 95
    graceful_timeout = 90

# Start timer for total running time
start_time = time.time()


def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)
    id = uuid.uuid4()
    resource = Resource.create(attributes={"service.name": f"notification-admin-{id}"})

    trace.set_tracer_provider(TracerProvider(resource=resource))
    span_processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://signoz-otel-collector.signoz.svc.cluster.local:4317", insecure=True)
    )
    trace.get_tracer_provider().add_span_processor(span_processor)


def on_starting(server):
    server.log.info("Starting Notifications Admin")
    server.log.info(f"Using worker class: {worker_class}")

    # Log telemetry configuration using the same detection logic
    server.log.info(f"OpenTelemetry detected: {otel_detected}")

    if otel_detected:
        server.log.info("✅ OpenTelemetry auto-instrumentation active - using sync workers to avoid SSL conflicts")
        # Log which env vars triggered detection´
        active_vars = [var for var in otel_env_vars if os.environ.get(var)]
        if active_vars:
            server.log.info(f"OTEL environment variables: {active_vars}")
        pythonpath = os.environ.get("PYTHONPATH", "")
        if "otel-auto-instrumentation" in pythonpath:
            server.log.info("OTEL auto-instrumentation detected in PYTHONPATH")
    else:
        server.log.info("No OpenTelemetry detected - using gevent workers for better performance")

    server.log.info("AWS X-Ray removed - OpenTelemetry handles all tracing")


def worker_abort(worker):
    worker.log.info("worker received ABORT {}".format(worker.pid))
    for threadId, stack in sys._current_frames().items():
        worker.log.error("".join(traceback.format_stack(stack)))


def on_exit(server):
    elapsed_time = time.time() - start_time
    server.log.info("Stopping Notifications Admin")
    server.log.info("Total gunicorn Admin running time: {:.2f} seconds".format(elapsed_time))


def worker_int(worker):
    worker.log.info("worker: received SIGINT {}".format(worker.pid))


def post_worker_init(worker):
    """Initialize worker process - useful for OpenTelemetry sync workers"""
    if otel_detected:
        worker.log.info(f"Initializing sync worker {worker.pid} for OpenTelemetry instrumentation")
        # Ensure clean SSL context in sync workers
        import ssl

        # Reset any cached SSL contexts to prevent recursion issues
        if hasattr(ssl, "_create_default_https_context"):
            ssl._create_default_https_context = ssl.create_default_context
    else:
        worker.log.info(f"Initializing gevent worker {worker.pid}")
