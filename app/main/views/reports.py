from datetime import datetime, timezone

import requests
from flask import (
    Response,
    current_app,
    flash,
    jsonify,
    render_template,
    stream_with_context,
    url_for,
)
from flask_login import current_user

from app import reports_api_client
from app.articles import get_current_locale
from app.main import main
from app.utils import user_has_permissions

CHUNK_SIZE = 1024 * 1024  # 1 MB


@main.route("/services/<service_id>/reports", methods=["GET"])
@user_has_permissions("view_activity")
def reports(service_id):
    reports = reports_api_client.get_reports_for_service(service_id)
    partials = get_reports_partials(reports)
    return render_template(
        "views/reports/reports.html", partials=partials, updates_url=url_for(".view_reports_updates", service_id=service_id)
    )


@main.route("/services/<service_id>/reports", methods=["post"])
@user_has_permissions("view_activity")
def generate_report(service_id):
    current_lang = get_current_locale(current_app)
    reports_api_client.request_report(user_id=current_user.id, service_id=service_id, language=current_lang, report_type="email")
    flash("Test report has been requested", "default")
    reports = reports_api_client.get_reports_for_service(service_id)
    for report in reports:
        report["filename_display"] = get_report_filename(report=report, with_extension=False)
    partials = get_reports_partials(reports)
    return render_template(
        "views/reports/reports.html", partials=partials, updates_url=url_for(".view_reports_updates", service_id=service_id)
    )


def get_reports_partials(reports):
    for report in reports:
        set_report_expired(report)
        report["filename_display"] = get_report_filename(report=report, with_extension=False)
    report_totals = get_report_totals(reports)
    return {
        "reports": render_template(
            "views/reports/reports-table.html",
            reports=reports,
        ),
        "report-footer": render_template(
            "views/reports/report-footer.html",
            report_totals=report_totals,
        ),
    }


@main.route("/services/<service_id>/reports/reports.json")
@user_has_permissions("view_activity")
def view_reports_updates(service_id):
    reports = reports_api_client.get_reports_for_service(service_id)
    return jsonify(**get_reports_partials(reports))


@main.route("/services/<service_id>/reports/download/<report_id>", methods=["GET"])
@user_has_permissions("view_activity")
def download_report_csv(service_id, report_id):
    """
    Proxies the report CSV file, allowing the filename to be set via Content-Disposition.
    The actual filename can be customized later as needed.
    """
    # Fetch the report details to get the URL
    reports = reports_api_client.get_reports_for_service(service_id)
    report = next((r for r in reports if str(r.get("id")) == str(report_id)), None)
    if not report or not report.get("url"):
        return ("Report not found", 404)

    remote_url = report["url"]
    # Stream the remote CSV file
    remote_response = requests.get(remote_url, stream=True)
    if remote_response.status_code != 200:
        return ("Failed to fetch report file", 502)

    filename = get_report_filename(report)
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": remote_response.headers.get("Content-Type", "text/csv"),
    }
    return Response(
        stream_with_context(remote_response.iter_content(chunk_size=CHUNK_SIZE)),
        headers=headers,
        status=200,
    )


def get_report_filename(report, with_extension=True):
    # Parse the ISO datetime string to a datetime object
    requested_at = datetime.fromisoformat(report["requested_at"])
    date_str = requested_at.strftime("%Y-%m-%d")
    partial_id = report["id"][:8]
    name = f"{date_str} [{report["language"]}] {partial_id}"
    if with_extension:
        name += ".csv"
    return name


def set_report_expired(report):
    if report["status"] == "ready" and datetime.fromisoformat(report["expires_at"]) < datetime.now(timezone.utc):
        report["status"] = "expired"


def get_report_totals(reports):
    report_totals = {
        "ready": 0,
        "generating": 0,
        "expired": 0,
        "error": 0,
    }
    for report in reports:
        set_report_expired(report)
        if report["status"] in ["requested", "generating"]:
            report_totals["generating"] += 1
        else:
            report_totals[report["status"]] += 1
    return report_totals
