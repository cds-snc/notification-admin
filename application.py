from dotenv import load_dotenv
from flask import Flask
from app import create_app
import sentry_sdk
import os
from sentry_sdk.integrations.flask import FlaskIntegration

load_dotenv()

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_URL', ''),
    integrations=[FlaskIntegration()]
)

application = Flask('app')

create_app(application)
