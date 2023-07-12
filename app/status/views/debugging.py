from flask import abort, current_app, request

from app.status import status


@status.route("/_debug", methods=["GET"])
def debug():
    """A route we can hit to help us debug in AWS. Currently just raises an exception to test logging.

    Raises:
        Exception: if you pass the correct key as a query param and you're in a non-production environment
    """
    if (
        current_app.config["NOTIFY_ENVIRONMENT"] in ["development", "test", "staging", "scratch"]
        and current_app.config["DEBUG_KEY"]
        and current_app.config["DEBUG_KEY"] == request.args.get("key", None)
    ):
        raise Exception("Debugging")
    else:
        abort(404)
