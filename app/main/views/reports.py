import datetime

from flask import (
    render_template,
)

from app.main import main
from app.utils import user_is_platform_admin


@main.route("/services/<service_id>/reports", methods=["GET"])
@user_is_platform_admin
def reports(service_id):
    reports = [
        {
            "report_type": "email",
            "requested_at": datetime.datetime.utcnow(),
            "status": "ready",
            "url": "https://google.com",
            "job_id": None,
            "requested_by": "Test User",
        },
        {
            "report_type": "sms",
            "requested_at": datetime.datetime.utcnow(),
            "status": "ready",
            "url": "https://google.com",
            "job_id": None,
            "requested_by": "Test User",
        },
    ]
    return render_template("views/reports/reports.html", reports=reports)
