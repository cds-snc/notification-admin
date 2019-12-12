from flask import (
    redirect,
    flash,
    render_template,
    request,
    url_for,
)

from app.main.forms import (
    SMTPForm
)

from app import (
    current_service,
    service_api_client
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
        data=data,
        delete=request.args.get('delete')
    )

@main.route("/services/<service_id>/smtp-relay/manage", methods=['GET', 'POST'])
@user_has_permissions('manage_api_keys', restrict_admin_usage=True)
def manage_smtp(service_id):
    
    form = SMTPForm()

    if request.method == 'POST':
        service_api_client.add_smtp_relay(service_id=service_id, payload="")
        flash('{}'.format("SMPT server added"), 'default_with_tick')
        return redirect(url_for('.smtp_integration', service_id=service_id))

    return render_template(
        'views/smtp/manage.html',
        form=form
    )

@main.route("/services/<service_id>/smtp-relay/delete", methods=['GET', 'POST'])
@user_has_permissions('manage_api_keys', restrict_admin_usage=True)
def delete_smtp(service_id):
     return redirect(
        url_for('.smtp_integration', service_id=service_id)
    )