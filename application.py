import os

import sentry_sdk
from dotenv import load_dotenv
from flask import Flask
from sentry_sdk.integrations.flask import FlaskIntegration
from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

load_dotenv()

application = Flask('app')
application.wsgi_app = ProxyFix(application.wsgi_app)
create_app(application)
