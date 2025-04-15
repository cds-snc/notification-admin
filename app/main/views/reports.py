from datetime import datetime, timezone

from flask import (
    current_app,
    flash,
    jsonify,
    render_template,
    url_for,
)
from flask_login import current_user

from app import reports_api_client
from app.articles import get_current_locale
from app.main import main
from app.utils import user_is_platform_admin


@main.route("/services/<service_id>/reports", methods=["GET"])
@user_is_platform_admin
def reports(service_id):
    reports = reports_api_client.get_reports_for_service(service_id)
    partials = get_reports_partials(reports)
    return render_template(
        "views/reports/reports.html", partials=partials, updates_url=url_for(".view_reports_updates", service_id=service_id)
    )


@main.route("/services/<service_id>/reports", methods=["post"])
@user_is_platform_admin
def generate_report(service_id):
    current_lang = get_current_locale(current_app)
    reports_api_client.request_report(user_id=current_user.id, service_id=service_id, language=current_lang, report_type="email")
    flash("Test report has been requested", "default")
    reports = reports_api_client.get_reports_for_service(service_id)
    partials = get_reports_partials(reports)
    return render_template(
        "views/reports/reports.html", partials=partials, updates_url=url_for(".view_reports_updates", service_id=service_id)
    )


def get_reports_partials(reports):
    for report in reports:
        if report["status"] == "ready" and datetime.fromisoformat(report["expires_at"]) < datetime.now(timezone.utc):
            report["status"] = "expired"
    return {
        "reports": render_template(
            "views/reports/reports-table.html",
            reports=reports,
        )
    }


@main.route("/services/<service_id>/reports/reports.json")
@user_is_platform_admin
def view_reports_updates(service_id):
    reports = reports_api_client.get_reports_for_service(service_id)

    return jsonify(**get_reports_partials(reports))
