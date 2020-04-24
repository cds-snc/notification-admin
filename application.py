import os

import sentry_sdk
from dotenv import load_dotenv
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app

load_dotenv()

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_URL', ''),
    release="notify-admin@" + os.environ.get('GIT_SHA', '')
)

application = Flask('app')
application.wsgi_app = ProxyFix(application.wsgi_app)

create_app(application)

if os.environ.get('USE_LOCAL_JINJA_TEMPLATES') == 'True':
    print('')  # noqa: T001
    print('========================================================')  # noqa: T001
    print('')  # noqa: T001
    print('WARNING: USING LOCAL JINJA from /jinja_templates FOLDER!')  # noqa: T001
    print('')  # noqa: T001
    print('========================================================')  # noqa: T001
    print('')  # noqa: T001
