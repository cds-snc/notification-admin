from flask import (
    redirect,
    render_template,
    request,
    url_for,
)

from app import (
    current_service,
)
from app.main import main
from flask_login import current_user
from app.utils import email_safe, user_has_permissions


@main.route("/services/<service_id>/smtp")
@user_has_permissions('manage_api_keys')
def smtp_integration(service_id):
    return render_template(
        'views/smtp/index.html'
    )