from flask import (
    flash,
    render_template,
)
from flask_login import current_user

from app import reports_api_client
from app.main import main
from app.utils import user_is_platform_admin


@main.route("/services/<service_id>/reports", methods=["GET"])
@user_is_platform_admin
def reports(service_id):
    reports = reports_api_client.get_reports_for_service(service_id)
    return render_template("views/reports/reports.html", reports=reports)


@main.route("/services/<service_id>/reports", methods=["post"])
@user_is_platform_admin
def generate_report(service_id):
    reports_api_client.request_report(user_id=current_user.id, service_id=service_id, report_type="email")
    flash("Test report has been requested", "default")
    reports = reports_api_client.get_reports_for_service(service_id)
    return render_template("views/reports/reports.html", reports=reports)
