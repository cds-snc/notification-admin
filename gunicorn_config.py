import os
import sys
import traceback

workers = 5
worker_class = "eventlet"
bind = "0.0.0.0:{}".format(os.getenv("PORT"))
disable_redirect_access_to_syslog = True


def worker_abort(worker):
    worker.log.info("worker received ABORT")
    for threadId, stack in sys._current_frames().items():
        worker.log.error(''.join(traceback.format_stack(stack)))
