import beeline
import logging
import re

from flask import abort, has_request_context, request
from flask_login import current_user
from notifications_python_client import __version__
from notifications_python_client.base import BaseAPIClient

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
        span = beeline.start_span(context={
            "name": "Notify API call",
            "type": "GET",
            "url": url,
        })
        if re.search(r'\/user\/[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}\Z', url) is None:
            self.log_admin_call(url, "GET")
        result = super().request("GET", url, params=params)
        beeline.finish_span(span)
        return result

    def post(self, *args, **kwargs):
        if "url" in kwargs:
            self.log_admin_call(kwargs["url"], "POST")
        if len(args) > 0:
            self.log_admin_call(args[0], "POST")
        self.check_inactive_service()
        span = beeline.start_span(context={
            "name": "Notify API call",
            "type": "POST",
            "url": kwargs["url"],
        })
        result = super().post(*args, **kwargs)
        beeline.finish_span(span)
        return result

    def put(self, *args, **kwargs):
        if "url" in kwargs:
            self.log_admin_call(kwargs["url"], "PUT")
        if len(args) > 0:
            self.log_admin_call(args[0], "PUT")
        self.check_inactive_service()
        span = beeline.start_span(context={
            "name": "Notify API call",
            "type": "PUT",
            "url": kwargs["url"],
        })
        result = super().put(*args, **kwargs)
        beeline.finish_span(span)
        return result

    def delete(self, *args, **kwargs):
        if "url" in kwargs:
            self.log_admin_call(kwargs["url"], "DELETE")
        if len(args) > 0:
            self.log_admin_call(args[0], "DELETE")
        self.check_inactive_service()
        span = beeline.start_span(context={
            "name": "Notify API call",
            "type": "DELETE",
            "url": kwargs["url"],
        })
        result = super().delete(*args, **kwargs)
        beeline.finish_span(span)
        return result


class InviteTokenError(Exception):
    pass
