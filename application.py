import os

from apig_wsgi import make_lambda_handler
from aws_xray_sdk.core import patch_all, xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware
from dotenv import load_dotenv
from flask import Flask

from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

load_dotenv()
# Patch all supported libraries for X-Ray
# Used to trace requests and responses through the stack
patch_all()

application = Flask("app")
application.wsgi_app = ProxyFix(application.wsgi_app)  # type: ignore
xray_recorder.configure(service='Notify-Admin')
XRayMiddleware(application, xray_recorder)
create_app(application)

apig_wsgi_handler = make_lambda_handler(application, binary_support=True)

if os.environ.get("USE_LOCAL_JINJA_TEMPLATES") == "True":
    print("")  # noqa: T201
    print("========================================================")  # noqa: T201
    print("")  # noqa: T201
    print("WARNING: USING LOCAL JINJA from /jinja_templates FOLDER!")  # noqa: T201
    print(".env USE_LOCAL_JINJA_TEMPLATES=True")  # noqa: T201
    print("")  # noqa: T201
    print("========================================================")  # noqa: T201
    print("")  # noqa: T201


def handler(event, context):
    return apig_wsgi_handler(event, context)
