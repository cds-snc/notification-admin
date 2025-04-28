from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

from freezegun import freeze_time

from app.main.views.reports import get_report_totals, set_report_expired


def test_reports_page_requires_platform_admin(client_request, platform_admin_user, service_one, mocker):
    client_request.login(platform_admin_user)
    mocker.patch("app.reports_api_client.get_reports_for_service", return_value=[])
    client_request.get(
        "main.reports",
        service_id=service_one["id"],
        _expected_status=200,
    )


def test_reports_page_forbidden_for_non_platform_admin(client_request, mocker, service_one):
    mocker.patch("app.reports_api_client.get_reports_for_service", return_value=[])
    client_request.get("main.reports", service_id=service_one["id"], _expected_status=403)


@freeze_time("2025-01-01 00:01:00.000000")
def test_get_reports_shows_list_of_reports(client_request, platform_admin_user, mock_get_reports, mocker, service_one):
    client_request.login(platform_admin_user)

    response = client_request.get("main.reports", service_id=service_one["id"], _expected_status=200)

    reports_table = response.find("table")
    rows = reports_table.find_all("tr")[1:]  # Skip header row
    assert len(rows) == 3
    assert "2025-01-01 [en] report-1" in rows[0].text
    assert "Download before" in rows[0].text
    assert "2025-01-01 [en] report-2" in rows[1].text
    assert "Deleted at" in rows[1].text  # Status changed due to expiration
    assert "2025-01-01 [fr] report-3" in rows[2].text
    assert "Preparing report" in rows[2].text


@freeze_time("2025-01-01 00:01:00.000000")
def test_download_report_csv_streams_the_report(
    client_request,
    platform_admin_user,
    mock_get_reports,
    mocker,
    service_one,
):
    # Create a mock response for the requests.get call
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.headers = {"Content-Type": "text/csv"}
    mock_response.iter_content.return_value = [b"csv,content,here"]
    mock_requests_get = mocker.patch("requests.get", return_value=mock_response)

    client_request.login(platform_admin_user)

    response = client_request.get(
        "main.download_report_csv",
        service_id=service_one["id"],
        report_id="report-1",
        _expected_status=200,
        _return_response=True,
    )

    assert response.headers["Content-Type"] == "text/csv"
    assert "attachment; filename=" in response.headers["Content-Disposition"]
    assert "2025-01-01 [en] report-1.csv" in response.headers["Content-Disposition"]

    mock_get_reports.assert_called_once_with(service_one["id"])
    mock_requests_get.assert_called_once_with("https://example.com/report-1.csv", stream=True)


@freeze_time("2025-01-01 00:01:00.000000")
def test_download_report_csv_returns_404_for_nonexistent_report(
    client_request,
    platform_admin_user,
    mock_get_reports,
    mocker,
    service_one,
):
    client_request.login(platform_admin_user)

    client_request.get(
        "main.download_report_csv",
        service_id=service_one["id"],
        report_id="nonexistent-id",
        _expected_status=404,
        _return_response=True,
    )


@freeze_time("2025-01-01 00:01:00.000000")
def test_download_report_csv_forbidden_for_non_platform_admin(
    client_request,
    mock_get_reports,
    mocker,
    service_one,
):
    client_request.get("main.download_report_csv", service_id=service_one["id"], report_id="report-1", _expected_status=403)


def test_generate_report_creates_new_report(
    client_request,
    platform_admin_user,
    mock_get_reports,
    mocker,
    service_one,
):
    mock_request_report = mocker.patch("app.reports_api_client.request_report")
    client_request.login(platform_admin_user)

    client_request.post("main.generate_report", service_id=service_one["id"], _expected_status=200)

    mock_request_report.assert_called_once_with(
        user_id=platform_admin_user["id"], service_id=service_one["id"], report_type="email", language="en"
    )


@freeze_time("2025-01-01 00:01:00.000000")
def test_set_report_expired_changes_status_when_expired():
    # Create a report that's expired (expires_at is in the past)
    report = {"status": "ready", "expires_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}

    # Call the function
    set_report_expired(report)

    # Check the status was changed to expired
    assert report["status"] == "expired"


@freeze_time("2025-01-01 00:01:00.000000")
def test_set_report_expired_does_not_change_status_when_not_expired():
    # Create a report that's not expired (expires_at is in the future)
    report = {"status": "ready", "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()}

    # Call the function
    set_report_expired(report)

    # Check the status was not changed
    assert report["status"] == "ready"


@freeze_time("2025-01-01 00:01:00.000000")
def test_set_report_expired_does_not_change_status_for_non_ready_reports():
    # Create a report that's expired but has a non-ready status
    report = {"status": "generating", "expires_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}

    # Call the function
    set_report_expired(report)

    # Check the status was not changed
    assert report["status"] == "generating"


def test_get_report_totals_counts_correctly():
    # Create a list of reports with different statuses
    reports = [
        {"status": "ready", "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()},
        {"status": "ready", "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()},
        {"status": "generating", "expires_at": datetime.now(timezone.utc).isoformat()},
        {"status": "requested", "expires_at": datetime.now(timezone.utc).isoformat()},
        {"status": "error", "expires_at": datetime.now(timezone.utc).isoformat()},
        {"status": "expired", "expires_at": datetime.now(timezone.utc).isoformat()},
    ]

    # Get the report totals
    totals = get_report_totals(reports)

    # Check the counts are correct
    assert totals == {
        "ready": 2,
        "generating": 2,  # Combines "generating" and "requested"
        "expired": 1,
        "error": 1,
    }


def test_get_report_totals_handles_empty_list():
    # Call with an empty list
    totals = get_report_totals([])

    # Check the counts are all zero
    assert totals == {"ready": 0, "generating": 0, "expired": 0, "error": 0}


def test_get_report_totals_marks_expired_reports_correctly():
    # Create a report that should be marked as expired by get_report_totals
    reports = [{"status": "ready", "expires_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}]

    # Get the report totals
    totals = get_report_totals(reports)

    # Check the report was counted as expired
    assert totals == {"ready": 0, "generating": 0, "expired": 1, "error": 0}
    # Check that the report's status was actually changed
    assert reports[0]["status"] == "expired"
