import os

import sentry_sdk
from dotenv import load_dotenv
from flask import Flask
from sentry_sdk.integrations.flask import FlaskIntegration

from app import create_app

load_dotenv()

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_URL', ''),
    integrations=[FlaskIntegration()]
)

application = Flask('app')

create_app(application)
