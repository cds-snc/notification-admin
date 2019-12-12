from flask import (
    redirect,
    render_template,
    request,
    url_for,
)

from app.main.forms import (
    SMTPForm
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
    data = current_service.smtp_relay()
    return render_template(
        'views/smtp/index.html',
        data=data
    )

@main.route("/services/<service_id>/smtp-relay/manage", methods=['GET', 'POST'])
@user_has_permissions('manage_api_keys', restrict_admin_usage=True)
def manage_smtp(service_id):
    
    form = SMTPForm()

    return render_template(
        'views/smtp/manage.html',
        form=form
    )