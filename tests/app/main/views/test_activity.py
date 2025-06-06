import json
import uuid
from urllib.parse import parse_qs, urlparse

import pytest
from flask import url_for
from freezegun import freeze_time

from app.main.views.jobs import get_available_until_date, get_status_filters
from app.models.service import Service
from tests import notification_json
from tests.conftest import (
    SERVICE_ONE_ID,
    create_active_caseworking_user,
    create_active_user_view_permissions,
    create_notifications,
    normalize_spaces,
)


@pytest.mark.parametrize(
    "user,extra_args,expected_update_endpoint,expected_limit_days,page_title",
    [
        (
            create_active_user_view_permissions(),
            {"message_type": "email"},
            "/email.json",
            7,
            "Emails   in the past 7 days",
        ),
        (
            create_active_user_view_permissions(),
            {"message_type": "sms"},
            "/sms.json",
            7,
            "Text messages   in the past 7 days",
        ),
        (
            create_active_caseworking_user(),
            {},
            ".json",
            7,
            "Sent messages in the past 7 days",
        ),
    ],
)
@pytest.mark.parametrize(
    "status_argument, expected_api_call",
    [
        (
            "",
            [
                "created",
                "pending",
                "sending",
                "pending-virus-check",
                "delivered",
                "sent",
                "returned-letter",
                "failed",
                "temporary-failure",
                "permanent-failure",
                "technical-failure",
                "virus-scan-failed",
                "validation-failed",
            ],
        ),
        ("sending", ["sending", "created", "pending", "pending-virus-check"]),
        ("delivered", ["delivered", "sent", "returned-letter"]),
        (
            "failed",
            [
                "failed",
                "temporary-failure",
                "permanent-failure",
                "technical-failure",
                "virus-scan-failed",
                "validation-failed",
            ],
        ),
    ],
)
@pytest.mark.parametrize("page_argument, expected_page_argument", [(1, 1), (22, 22), (None, 1)])
@pytest.mark.parametrize(
    "to_argument, expected_to_argument",
    [
        ("", ""),
        ("+447900900123", "+447900900123"),
        ("test@example.com", "test@example.com"),
    ],
)
def test_can_show_notifications(
    client_request,
    logged_in_client,
    service_one,
    mock_get_notifications,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_has_no_jobs,
    mock_get_reports,
    user,
    extra_args,
    expected_update_endpoint,
    expected_limit_days,
    page_title,
    status_argument,
    expected_api_call,
    page_argument,
    expected_page_argument,
    to_argument,
    expected_to_argument,
    mocker,
    fake_uuid,
):
    client_request.login(user)
    if expected_to_argument:
        page = client_request.post(
            "main.view_notifications",
            service_id=SERVICE_ONE_ID,
            status=status_argument,
            page=page_argument,
            _data={"to": to_argument},
            _expected_status=200,
            **extra_args,
        )
    else:
        page = client_request.get(
            "main.view_notifications",
            service_id=SERVICE_ONE_ID,
            status=status_argument,
            page=page_argument,
            **extra_args,
        )
    text_of_first_row = page.select("tbody tr")[0].text
    assert "6502532222" in text_of_first_row
    assert "template content" in text_of_first_row or "template subject" in text_of_first_row
    assert "Delivered" in text_of_first_row
    assert page_title in page.h1.text.strip()

    path_to_json = page.find("div", {"data-key": "notifications"})["data-resource"]

    url = urlparse(path_to_json)
    assert url.path == "/services/{}/notifications{}".format(
        SERVICE_ONE_ID,
        expected_update_endpoint,
    )
    query_dict = parse_qs(url.query)
    if status_argument:
        assert query_dict["status"] == [status_argument]
    if expected_page_argument:
        assert query_dict["page"] == [str(expected_page_argument)]
    assert "to" not in query_dict

    mock_get_notifications.assert_called_with(
        limit_days=expected_limit_days,
        page=expected_page_argument,
        service_id=SERVICE_ONE_ID,
        status=expected_api_call,
        template_type=list(extra_args.values()),
        to=expected_to_argument,
    )

    json_response = logged_in_client.get(
        url_for(
            "main.get_notifications_as_json",
            service_id=service_one["id"],
            status=status_argument,
            **extra_args,
        )
    )
    json_content = json.loads(json_response.get_data(as_text=True))
    assert json_content.keys() == {
        "counts",
        "notifications",
        "service_data_retention_days",
        "report-footer",
    }


def test_can_show_notifications_if_data_retention_not_available(
    client_request,
    mock_get_notifications,
    mock_get_service_statistics,
    mock_has_no_jobs,
    mock_get_reports,
):
    page = client_request.get(
        "main.view_notifications",
        service_id=SERVICE_ONE_ID,
        status="sending,delivered,failed",
    )
    assert page.h1.text.strip() == "Messages   in the past 7 days"


def test_download_not_available_to_users_without_dashboard(
    client_request,
    active_caseworking_user,
    mock_has_jobs,
    mock_get_reports,
):
    client_request.login(active_caseworking_user)
    client_request.get(
        "main.download_notifications_csv",
        service_id=SERVICE_ONE_ID,
        _expected_status=403,
    )


@pytest.mark.skip(reason="letters: unused functionality")
def test_letters_with_status_virus_scan_failed_shows_a_failure_description(
    mocker,
    active_user_with_permissions,
    client_request,
    service_one,
    mock_get_service_statistics,
    mock_get_service_data_retention,
):
    notifications = create_notifications(
        template_type="letter", status="virus-scan-failed", is_precompiled_letter=True, client_reference="client reference"
    )
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)

    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type="letter",
        status="",
    )

    error_description = page.find("div", attrs={"class": "table-field-status-error"}).text.strip()
    assert "Virus detected\n" in error_description


@pytest.mark.skip(reason="letters: unused functionality")
@pytest.mark.parametrize("letter_status", ["pending-virus-check", "virus-scan-failed"])
def test_should_not_show_preview_link_for_precompiled_letters_in_virus_states(
    mocker,
    active_user_with_permissions,
    client_request,
    service_one,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    letter_status,
):
    notifications = create_notifications(
        template_type="letter", status=letter_status, is_precompiled_letter=True, client_reference="ref"
    )
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)

    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type="letter",
        status="",
    )

    assert not page.find("a", attrs={"class": "file-list-filename"})


def test_shows_message_when_no_notifications(
    client_request,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_notifications_with_no_notifications,
    mock_get_reports,
):
    page = client_request.get(
        "main.view_notifications",
        service_id=SERVICE_ONE_ID,
        message_type="sms",
    )

    assert normalize_spaces(page.select("tbody tr")[0].text) == (
        "You have not sent messages recently Messages sent within the last 7 days will show up here. Start with one of your templates to send messages. Go to your templates"
    )


@pytest.mark.parametrize(
    ("initial_query_arguments," "form_post_data," "expected_search_box_label," "expected_search_box_contents"),
    [
        (
            {},
            {},
            "Search by email address or phone number",
            "",
        ),
        (
            {
                "message_type": "sms",
            },
            {},
            "Search by phone number",
            "",
        ),
        (
            {
                "message_type": "sms",
            },
            {
                "to": "+33(0)5-12-34-56-78",
            },
            "Search by phone number",
            "+33(0)5-12-34-56-78",
        ),
        (
            {
                "status": "failed",
                "message_type": "email",
                "page": "99",
            },
            {
                "to": "test@example.com",
            },
            "Search by email address",
            "test@example.com",
        ),
    ],
)
def test_search_recipient_form(
    client_request,
    mock_get_notifications,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    initial_query_arguments,
    form_post_data,
    expected_search_box_label,
    expected_search_box_contents,
):
    page = client_request.post(
        "main.view_notifications",
        service_id=SERVICE_ONE_ID,
        _data=form_post_data,
        _expected_status=200,
        **initial_query_arguments,
    )

    assert page.find("form")["method"] == "post"
    action_url = page.find("form")["action"]
    url = urlparse(action_url)
    assert url.path == "/services/{}/notifications/{}".format(
        SERVICE_ONE_ID, initial_query_arguments.get("message_type", "")
    ).rstrip("/")
    query_dict = parse_qs(url.query)
    assert query_dict == {}

    assert page.select_one("label[for=to]").text.strip() == expected_search_box_label

    recipient_inputs = page.select("input[name=to]")
    assert len(recipient_inputs) == 2

    for field in recipient_inputs:
        assert field["value"] == expected_search_box_contents


def test_should_show_notifications_for_a_service_with_next_previous(
    client_request,
    service_one,
    active_user_with_permissions,
    mock_get_notifications_with_previous_next,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    mocker,
):
    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type="sms",
        page=2,
    )

    next_page_link = page.find("a", {"rel": "next"})
    prev_page_link = page.find("a", {"rel": "previous"})
    assert (
        url_for(
            "main.view_notifications",
            service_id=service_one["id"],
            message_type="sms",
            page=3,
        )
        in next_page_link["href"]
    )
    assert "Next page" in next_page_link.text.strip()
    assert "page 3" in next_page_link.text.strip()
    assert (
        url_for(
            "main.view_notifications",
            service_id=service_one["id"],
            message_type="sms",
            page=1,
        )
        in prev_page_link["href"]
    )
    assert "Previous page" in prev_page_link.text.strip()
    assert "page 1" in prev_page_link.text.strip()


@pytest.mark.parametrize(
    "job_created_at, expected_date",
    [
        ("2016-01-10 11:09:00.000000+00:00", "2016-01-18"),
        ("2016-01-04 11:09:00.000000+00:00", "2016-01-12"),
        ("2016-01-03 11:09:00.000000+00:00", "2016-01-11"),
        ("2016-01-02 23:59:59.000000+00:00", "2016-01-10"),
    ],
)
@freeze_time("2016-01-10 12:00:00.000000")
def test_available_until_datetime(job_created_at, expected_date):
    """We are putting a raw datetime string in the span, which later gets
    formatted by js on the client. That formatting doesn't exist in the
    python tests so this test checks the date part of the datetime string
    and checking is correct."""
    available_until_datetime = get_available_until_date(job_created_at)
    available_until_date = str(available_until_datetime).split(" ")[0]
    assert available_until_date == expected_date


STATISTICS = {"sms": {"requested": 6, "failed": 2, "delivered": 1}}


def test_get_status_filters_calculates_stats(client):
    ret = get_status_filters(Service({"id": "foo"}), "sms", STATISTICS)

    assert {label: count for label, _option, _link, count in ret} == {
        "total": 6,
        "in transit": 3,
        "failed": 2,
        "delivered": 1,
    }


def test_get_status_filters_in_right_order(client):
    ret = get_status_filters(Service({"id": "foo"}), "sms", STATISTICS)

    assert [label for label, _option, _link, _count in ret] == [
        "total",
        "in transit",
        "delivered",
        "failed",
    ]


def test_get_status_filters_constructs_links(client):
    ret = get_status_filters(Service({"id": "foo"}), "sms", STATISTICS)

    link = ret[0][2]
    assert link == "/services/foo/notifications/sms?status={}".format("sending,delivered,failed")


def test_html_contains_notification_id(
    client_request,
    service_one,
    active_user_with_permissions,
    mock_get_notifications,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    mocker,
):
    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type="sms",
        status="",
    )

    notifications = page.tbody.find_all("tr")
    for tr in notifications:
        id = tr.attrs["id"]
        assert uuid.UUID(id.lstrip("cds"))


def test_html_contains_links_for_failed_notifications(
    client_request,
    active_user_with_permissions,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    mocker,
    app_,
):
    notifications = create_notifications(status="technical-failure")
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)
    response = client_request.get(
        "main.view_notifications",
        service_id=SERVICE_ONE_ID,
        message_type="sms",
        status="sending%2Cdelivered%2Cfailed",
    )
    notifications = response.tbody.find_all("tr")
    for tr in notifications:
        link_text = tr.find("div", class_="table-field-status-error").find("a").text
        assert normalize_spaces(link_text) == "Tech issue"


@pytest.mark.parametrize(
    "notification_type, expected_row_contents",
    (
        ("sms", ("6502532222 hello & welcome [hidden]")),
        ("email", ("example@canada.ca [hidden], hello & welcome")),
        (
            "letter",
            (
                # Letters don’t support redaction, but this test is still
                # worthwhile to show that the ampersand is not double-escaped
                "1 Example Street [hidden], hello & welcome"
            ),
        ),
    ),
)
def test_redacts_templates_that_should_be_redacted(
    client_request,
    mocker,
    active_user_with_permissions,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    notification_type,
    expected_row_contents,
):
    notifications = create_notifications(
        status="technical-failure",
        content="hello & welcome ((name))",
        subject="((name)), hello & welcome",
        personalisation={"name": "Jo"},
        redact_personalisation=True,
        template_type=notification_type,
    )
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)
    page = client_request.get(
        "main.view_notifications",
        service_id=SERVICE_ONE_ID,
        message_type="sms",
    )

    assert normalize_spaces(page.select("tbody tr th")[0].text) == (expected_row_contents)


@pytest.mark.parametrize(
    "message_type, tablist_visible, search_bar_visible",
    [("email", True, True), ("sms", True, True)],
)
def test_big_numbers_and_search_show_for_email_sms(
    client_request,
    service_one,
    mock_get_notifications,
    active_user_with_permissions,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    message_type,
    tablist_visible,
    search_bar_visible,
):
    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type=message_type,
        status="",
        page=1,
    )

    assert (len(page.select("nav.pill")) > 0) == tablist_visible
    assert (len(page.select("[type=search]")) > 0) == search_bar_visible


@freeze_time("2017-09-27 16:30:00.000000")
@pytest.mark.parametrize(
    "message_type, status, feedback_reason, expected_hint_status, single_line",
    [
        ("email", "created", None, "In transit since 2017-09-27T16:30:00+00:00", True),
        ("email", "sending", None, "In transit since 2017-09-27T16:30:00+00:00", True),
        (
            "email",
            "temporary-failure",
            None,
            "Content or inbox issue 16:31:00",
            False,
        ),
        ("email", "permanent-failure", None, "No such address 16:31:00", False),
        ("email", "delivered", None, "Delivered 16:31:00", True),
        ("sms", "created", None, "In transit since 2017-09-27T16:30:00+00:00", True),
        ("sms", "sending", None, "In transit since 2017-09-27T16:30:00+00:00", True),
        (
            "sms",
            "temporary-failure",
            None,
            "Carrier issue 16:31:00",
            False,
        ),
        ("sms", "permanent-failure", None, "No such number 16:31:00", False),
        (
            "sms",
            "provider-failure",
            "DESTINATION_COUNTRY_BLOCKED",
            "GC Notify cannot send text messages to some international numbers 16:31:00",
            False,
        ),
        (
            "sms",
            "provider-failure",
            "NO_ORIGINATION_IDENTITIES_FOUND",
            "GC Notify cannot send text messages to some international numbers 16:31:00",
            False,
        ),
        ("sms", "delivered", None, "Delivered 16:31:00", True),
    ],
)
def test_sending_status_hint_displays_correctly_on_notifications_page_new_statuses(
    client_request,
    service_one,
    active_user_with_permissions,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    message_type,
    status,
    feedback_reason,
    expected_hint_status,
    single_line,
    mocker,
    app_,
):
    notifications = create_notifications(template_type=message_type, feedback_reason=feedback_reason, status=status)
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)

    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type=message_type,
    )

    assert normalize_spaces(page.select(".table-field-right-aligned")[0].text) == expected_hint_status
    assert bool(page.select(".align-with-message-body")) is single_line


@pytest.mark.parametrize("message_type", [("email"), ("sms")])
def test_empty_message_display_on_notifications_report_when_none_sent(
    client_request,
    service_one,
    active_user_with_permissions,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    mocker,
    app_,
    message_type,
):
    notifications = notification_json(service_id=service_one["id"], rows=0)
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)

    page = client_request.get(
        "main.view_notifications",
        service_id=service_one["id"],
        message_type=message_type,
    )

    assert "You have not sent messages recently" in str(page.contents)


@pytest.mark.skip(reason="letters: unused functionality")
@pytest.mark.parametrize(
    "is_precompiled_letter,expected_address,expected_hint",
    [
        (True, "Full Name\nFirst address line\npostcode", "ref"),
        (False, "Full Name\nFirst address line\npostcode", "template subject"),
    ],
)
def test_should_expected_hint_for_letters(
    client_request,
    service_one,
    active_user_with_permissions,
    mock_get_service_statistics,
    mock_get_service_data_retention,
    mock_get_reports,
    mocker,
    fake_uuid,
    is_precompiled_letter,
    expected_address,
    expected_hint,
):
    notifications = create_notifications(
        template_type="letter",
        subject=expected_hint,
        is_precompiled_letter=is_precompiled_letter,
        client_reference=expected_hint,
        to=expected_address,
    )
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)

    page = client_request.get(
        "main.view_notifications",
        service_id=SERVICE_ONE_ID,
        message_type="letter",
    )

    assert page.find("p", {"class": "file-list-hint"}).text.strip() == expected_hint
