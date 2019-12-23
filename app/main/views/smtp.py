from flask import flash, redirect, render_template, request, url_for

from app import current_service, service_api_client
from app.main import main
from app.utils import user_is_platform_admin


@main.route("/services/<service_id>/smtp")
@user_is_platform_admin
def smtp_integration(service_id):
    data = current_service.smtp_relay()
    return render_template(
        'views/smtp/index.html',
        data=data,
        delete=request.args.get('delete')
    )


@main.route("/services/<service_id>/smtp/add", methods=['GET'])
@user_is_platform_admin
def manage_smtp(service_id):
    data = service_api_client.add_smtp_relay(service_id=service_id, payload="")
    flash('{}'.format("SMPT server added"), 'default_with_tick')
    return render_template(
        'views/smtp/index.html',
        data=data,
        delete=request.args.get('delete')
    )


@main.route("/services/<service_id>/smtp/delete", methods=['GET', 'POST'])
@user_is_platform_admin
def delete_smtp(service_id):
    service_api_client.delete_smtp_relay(service_id=service_id)
    return redirect(
        url_for('.smtp_integration', service_id=service_id)
    )
