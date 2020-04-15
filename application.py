import os

import beeline
import sentry_sdk
from beeline.middleware.flask import HoneyMiddleware
from dotenv import load_dotenv
from flask import Flask
from sentry_sdk.integrations.flask import FlaskIntegration
from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

load_dotenv()

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_URL', ''),
    integrations=[FlaskIntegration()]
)

beeline.init(
    writekey=os.environ.get('HONEYCOMB_API_KEY', ''),
    dataset='notification',
    service_name='notification-admin'
)

application = Flask('app')
application.wsgi_app = ProxyFix(application.wsgi_app)
application = HoneyMiddleware(application)

create_app(application)
