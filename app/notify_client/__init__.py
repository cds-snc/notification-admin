import logging
import re

from flask import abort, has_request_context, request
from flask_login import current_user
from notifications_python_client import __version__
from notifications_python_client.base import BaseAPIClient
from notifications_python_client.errors import HTTP503Error

logger = logging.getLogger(__name__)


def _attach_current_user(data):
    return dict(
        created_by=current_user.id,
        **data
    )


class NotifyAdminAPIClient(BaseAPIClient):

    def __init__(self):
        super().__init__("a" * 73, "b")

    def init_app(self, app):
        self.base_url = app.config['API_HOST_NAME']
        self.service_id = app.config['ADMIN_CLIENT_USER_NAME']
        self.api_key = app.config['ADMIN_CLIENT_SECRET']
        self.route_secret = app.config['ROUTE_SECRET_KEY_1']

    def generate_headers(self, api_token):
        headers = {
            "Content-type": "application/json",
            "Authorization": "Bearer {}".format(api_token),
            "X-Custom-Forwarder": self.route_secret,
            "User-agent": "NOTIFY-API-PYTHON-CLIENT/{}".format(__version__)
        }
        return self._add_request_id_header(headers)

    @staticmethod
    def _add_request_id_header(headers):
        if not has_request_context():
            return headers
        headers['X-B3-TraceId'] = request.request_id
        headers['X-B3-SpanId'] = request.span_id
        return headers

    def check_inactive_service(self):
        # this file is imported in app/__init__.py before current_service is initialised, so need to import later
        # to prevent cyclical imports
        from app import current_service

        # if the current service is inactive and the user isn't a platform admin, we should block them from making any
        # stateful modifications to that service
        if current_service and not current_service.active and not current_user.platform_admin:
            abort(403)

    def log_admin_call(self, url, method):
        if hasattr(current_user, "platform_admin") and current_user.platform_admin:
            user = current_user.email_address + "|" + current_user.id
            logger.warn("Admin API request {} {} {} ".format(method, url, user))

    def get(self, url, params=None):
        if re.search(r'\/user\/[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}\Z', url) is None:
            self.log_admin_call(url, "GET")
        return super().request("GET", url, params=params)

    def post(self, *args, **kwargs):
        if "url" in kwargs:
            self.log_admin_call(kwargs["url"], "POST")
        if len(args) > 0:
            self.log_admin_call(args[0], "POST")
        self.check_inactive_service()
        return super().post(*args, **kwargs)

    def put(self, *args, **kwargs):
        if "url" in kwargs:
            self.log_admin_call(kwargs["url"], "PUT")
        if len(args) > 0:
            self.log_admin_call(args[0], "PUT")
        self.check_inactive_service()
        return super().put(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if "url" in kwargs:
            self.log_admin_call(kwargs["url"], "DELETE")
        if len(args) > 0:
            self.log_admin_call(args[0], "DELETE")
        self.check_inactive_service()
        return super().delete(*args, **kwargs)

    def _perform_request(self, method, url, kwargs):
        # Retry requests to the Notify API up to 3 times
        # if they fail with a 503 status, thrown when
        # the admin can't connect to the API.
        for i in [1, 2, 3]:
            try:
                return super()._perform_request(method, url, kwargs)
            except HTTP503Error as e:
                logger.warn("Retrying API request after failure {} {}".format(method, url))
                if i == 3:
                    raise e


class InviteTokenError(Exception):
    pass
