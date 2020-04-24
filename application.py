import os

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.redis import RedisIntegration

from dotenv import load_dotenv
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

load_dotenv()

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_URL', ''),
    integrations=[
        FlaskIntegration(),
        RedisIntegration(),
    ],
    release="notify-admin@" + os.environ.get('GIT_SHA', '')
)

application = Flask('app')
application.wsgi_app = ProxyFix(application.wsgi_app)

create_app(application)
