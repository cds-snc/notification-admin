import os

from apig_wsgi import make_lambda_handler
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware
from dotenv import load_dotenv
from flask import Flask
from jinja2 import FileSystemLoader

from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

class CustomLoader(FileSystemLoader):
    def load(self, environment, name, globals=None):
        template = super().load(environment, name, globals)
        template.name = name
        return template


load_dotenv()

application = Flask("app")
application.wsgi_app = ProxyFix(application.wsgi_app)  # type: ignore

# Use the custom loader
custom_loader = CustomLoader(searchpath='app/templates')
application.jinja_loader = custom_loader

create_app(application)

xray_recorder.configure(service='admin')
XRayMiddleware(application, xray_recorder)

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

