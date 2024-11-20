import os
import sys
import time
import traceback

import gunicorn  # type: ignore
import newrelic.agent  # See https://bit.ly/2xBVKBH

environment = os.environ.get("NOTIFY_ENVIRONMENT")
newrelic.agent.initialize(environment=environment)  # noqa: E402

# Guincorn sets the server type on our app. We don't want to show it in the header in the response.
gunicorn.SERVER = "Undisclosed"

workers = 5
worker_class = "gevent"
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

# Start timer for total running time
start_time = time.time()

def on_starting(server):
    server.log.info("Starting Notifications Admin")


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
