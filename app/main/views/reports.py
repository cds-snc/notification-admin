from datetime import datetime, timezone

from flask import (
    Response,
    current_app,
    flash,
    jsonify,
    render_template,
    request,
    session,
    stream_with_context,
    url_for,
)
from flask_login import current_user
from notifications_utils.timezones import convert_utc_to_local_timezone

from app import reports_api_client
from app.articles import get_current_locale
from app.main import main
from app.s3_client.s3_csv_client import s3download_report_chunks
from app.utils import user_has_permissions

CHUNK_SIZE = 1024 * 1024  # 1 MB


@main.route("/services/<service_id>/reports", methods=["GET"])
@user_has_permissions("view_activity")
def reports(service_id):
    reports = reports_api_client.get_reports_for_service(service_id)
    partials = get_reports_partials(reports)

    # Get the referrer URL from the request
    referer = request.referrer

    # If referer exists and is not the current page (not a refresh)
    if referer and not referer.endswith(f"/services/{service_id}/reports"):
        # Store the referer in session
        session[f"back_link_{service_id}_reports"] = referer

    # Use stored back link from session if available, otherwise use a default
    back_link = session.get(f"back_link_{service_id}_reports", url_for("main.service_dashboard", service_id=service_id))

    return render_template(
        "views/reports/reports.html",
        partials=partials,
        updates_url=url_for(".view_reports_updates", service_id=service_id),
        back_link=back_link,
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

    # Use stored back link from session if available, otherwise use a default
    back_link = session.get(f"back_link_{service_id}_reports", url_for("main.service_dashboard", service_id=service_id))

    return render_template(
        "views/reports/reports.html",
        partials=partials,
        updates_url=url_for(".view_reports_updates", service_id=service_id),
        back_link=back_link,
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

    if not report:
        return ("Report not found", 404)

    # Stream the remote CSV file
    try:
        filename = get_report_filename(report)
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv",
        }

        # Stream the data in chunks
        def generate():
            for chunk in s3download_report_chunks(service_id, report_id):
                yield chunk

        return Response(
            stream_with_context(generate()),
            headers=headers,
            status=200,
        )
    except Exception as e:
        current_app.logger.error(f"Error streaming report file for service {service_id}, report {report_id}: {str(e)}")
        flash("Could not download report file", "error")
        return ("Failed to fetch report file", 502)


def get_report_filename(report, with_extension=True):
    # Parse the ISO datetime string to a datetime object
    requested_at = datetime.fromisoformat(report["requested_at"])

    # Convert UTC time to Eastern Time (America/Toronto) and format with timezone indicator
    if requested_at.tzinfo is not None:
        # If it has timezone, we can directly pass it to convert function but need to make it naive first
        # depending on how convert_utc_to_local_timezone is implemented
        local_time = convert_utc_to_local_timezone(requested_at.replace(tzinfo=None))
    else:
        # Original behavior for naive datetimes
        local_time = convert_utc_to_local_timezone(requested_at)

    # Determine if it's EDT or EST
    timezone_name = "EDT" if local_time.dst() else "EST"
    if report["language"] == "fr":
        timezone_name = "HAE" if local_time.dst() else "HNE"

    # Format the datetime with timezone indicator
    formatted_datetime = local_time.strftime("%Y-%m-%d %H.%M.%S")

    # Create report names with proper formatting
    lang_indicator = f"[{report['language']}]" if report["language"] else "[en]"
    report_name = f"{formatted_datetime} {timezone_name} {lang_indicator}"

    if with_extension:
        report_name += ".csv"
    return report_name


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
