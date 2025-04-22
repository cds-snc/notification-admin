from datetime import datetime, timedelta, timezone

import pytest
from freezegun import freeze_time


@pytest.fixture
@freeze_time("2025-01-01 00:01:00.000000")
def mock_reports_data():
    return [
        {
            "id": "report-1",
            "status": "ready",
            "language": "en",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "requesting_user": {
                "id": "user-1",
                "name": "Test User",
            },
        },
        {
            "id": "report-2",
            "status": "ready",
            "language": "en",
            "expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "requesting_user": {
                "id": "user-1",
                "name": "Test User",
            },
        },
        {
            "id": "report-3",
            "status": "generating",
            "language": "fr",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "requesting_user": {
                "id": "user-1",
                "name": "Test User",
            },
        },
    ]


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
def test_get_reports_shows_list_of_reports(client_request, platform_admin_user, mock_reports_data, mocker, service_one):
    mocker.patch("app.reports_api_client.get_reports_for_service", return_value=mock_reports_data)
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


def test_generate_report_creates_new_report(
    client_request,
    platform_admin_user,
    mock_reports_data,
    mocker,
    service_one,
):
    mock_request_report = mocker.patch("app.reports_api_client.request_report")
    mocker.patch("app.reports_api_client.get_reports_for_service", return_value=mock_reports_data)
    client_request.login(platform_admin_user)

    client_request.post("main.generate_report", service_id=service_one["id"], _expected_status=200)

    mock_request_report.assert_called_once_with(
        user_id=platform_admin_user["id"], service_id=service_one["id"], report_type="email", language="en"
    )
