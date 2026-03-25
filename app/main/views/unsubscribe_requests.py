from flask import redirect, render_template, request, url_for

from app import service_api_client, unsubscribe_api_client
from app.main import main
from app.models.unsubscribe_requests_report import UnsubscribeRequestsReports


@main.route("/services/<uuid:service_id>/unsubscribe-requests/summary")
def unsubscribe_request_reports_summary(service_id):
    reports = UnsubscribeRequestsReports(service_id)
    return render_template(
        "views/unsubscribe-request-reports-summary.html",
        reports=reports,
    )


@main.route("/services/<uuid:service_id>/unsubscribe-requests/reports/latest")
@main.route("/services/<uuid:service_id>/unsubscribe-requests/reports/<uuid:batch_id>", methods=["GET", "POST"])
def unsubscribe_request_report(service_id, batch_id=None):
    reports = UnsubscribeRequestsReports(service_id)
    if batch_id:
        report = reports.get_by_batch_id(batch_id)
    else:
        report = reports.get_unbatched_report()

    if request.method == "POST":
        report_has_been_processed = request.form.get("report_has_been_processed") == "y"
        service_api_client.process_unsubscribe_request_report(
            service_id, batch_id=batch_id, data={"report_has_been_processed": report_has_been_processed}
        )
        return redirect(url_for("main.unsubscribe_request_reports_summary", service_id=service_id))

    return render_template(
        "views/unsubscribe-request-report.html",
        report=report,
        service_id=service_id,
    )


@main.route("/services/<uuid:service_id>/unsubscribe-requests/reports/download")
@main.route("/services/<uuid:service_id>/unsubscribe-requests/reports/download/<uuid:batch_id>.csv")
def download_unsubscribe_request_report(service_id, batch_id=None):
    if not batch_id:
        return redirect(url_for("main.create_unsubscribe_request_report", service_id=service_id))

    report = service_api_client.get_unsubscribe_request_report(service_id, batch_id)
    column_names = {
        "email_address": "Email address",
        "template_name": "Template name",
        "original_file_name": "Uploaded spreadsheet file name",
        "template_sent_at": "Template sent at",
        "unsubscribe_request_received_at": "Unsubscribe request received at",
    }
    rows = [",".join(column_names.values())]
    for row in report.get("unsubscribe_requests", []):
        rows.append(",".join(str(row.get(key, "")) for key in column_names.keys()))
    csv_data = "\n".join(rows)

    earliest = report.get("earliest_timestamp", "")[:10]
    latest = report.get("latest_timestamp", "")[:10]
    filename = f"Email unsubscribe requests {earliest} to {latest}.csv"

    return (
        csv_data,
        200,
        {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@main.route("/services/<uuid:service_id>/unsubscribe-requests/reports/batch-report")
def create_unsubscribe_request_report(service_id):
    reports = UnsubscribeRequestsReports(service_id)
    created_report_id = reports.batch_unbatched()
    return redirect(
        url_for(
            "main.unsubscribe_request_report",
            service_id=service_id,
            batch_id=created_report_id,
        )
    )


@main.route("/unsubscribe/<uuid:notification_id>/<string:token>", methods=["GET", "POST"])
def unsubscribe(notification_id, token):
    """Human-facing confirmation page for the email body unsubscribe link."""
    if request.method == "POST":
        if not unsubscribe_api_client.unsubscribe(notification_id, token):
            return render_template("views/unsubscribe-failed.html"), 404
        return redirect(url_for("main.unsubscribe_confirmed"))
    return render_template("views/unsubscribe.html")


@main.route("/unsubscribe/confirmed")
def unsubscribe_confirmed():
    return render_template("views/unsubscribe.html", confirmed=True)


@main.route("/unsubscribe/example", methods=["GET", "POST"])
def unsubscribe_example():
    if request.method == "POST":
        return redirect(url_for("main.unsubscribe_example_confirmed"))
    return render_template("views/unsubscribe.html", example=True)


@main.route("/unsubscribe/example/confirmed")
def unsubscribe_example_confirmed():
    return render_template("views/unsubscribe.html", example=True, confirmed=True)
