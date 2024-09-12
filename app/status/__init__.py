from flask import Blueprint

status = Blueprint("status", __name__)

from app.status.views import healthcheck  # noqa isort:skip
from app.status.views import debugging  # noqa isort:skip
