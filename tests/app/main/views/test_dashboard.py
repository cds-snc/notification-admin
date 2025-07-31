import copy
import re
from unittest.mock import ANY

import pytest
from bs4 import BeautifulSoup
from flask import url_for
from freezegun import freeze_time

from app.main.views.dashboard import (
    aggregate_by_type_daily,
    aggregate_notifications_stats,
    aggregate_status_types,
    aggregate_template_usage,
    format_monthly_stats_to_list,
    get_annual_data,
    get_dashboard_totals,
    get_free_paid_breakdown_for_billable_units,
)
from tests import validate_route_permission, validate_route_permission_with_client
from tests.conftest import (
    SERVICE_ONE_ID,
    ClientRequest,
    a11y_test,
    create_active_caseworking_user,
    create_active_user_view_permissions,
    normalize_spaces,
    set_config,
)

stub_template_stats = [
    {
        "template_type": "sms",
        "template_name": "one",
        "template_id": "id-1",
        "status": "created",
        "count": 50,
        "is_precompiled_letter": False,
    },
    {
        "template_type": "email",
        "template_name": "two",
        "template_id": "id-2",
        "status": "created",
        "count": 100,
        "is_precompiled_letter": False,
    },
    {
        "template_type": "email",
        "template_name": "two",
        "template_id": "id-2",
        "status": "technical-failure",
        "count": 100,
        "is_precompiled_letter": False,
    },
    {
        "template_type": "sms",
        "template_name": "one",
        "template_id": "id-1",
        "status": "delivered",
        "count": 50,
        "is_precompiled_letter": False,
    },
]


def create_stats(
    emails_requested=0,
    emails_delivered=0,
    emails_failed=0,
    sms_requested=0,
    sms_delivered=0,
    sms_failed=0,
):
    return {
        "sms": {
            "requested": sms_requested,
            "delivered": sms_delivered,
            "failed": sms_failed,
        },
        "email": {
            "requested": emails_requested,
            "delivered": emails_delivered,
            "failed": emails_failed,
        },
    }


@pytest.mark.parametrize(
    "user",
    (
        create_active_user_view_permissions(),
        create_active_caseworking_user(),
    ),
)
def test_redirect_from_old_dashboard(
    logged_in_client,
    user,
    mocker,
    fake_uuid,
):
    mocker.patch("app.user_api_client.get_user", return_value=user)
    expected_location = "/services/{}".format(SERVICE_ONE_ID)

    response = logged_in_client.get("/services/{}/dashboard".format(SERVICE_ONE_ID))

    assert response.status_code == 302
    assert response.location == expected_location
    assert expected_location == url_for("main.service_dashboard", service_id=SERVICE_ONE_ID)


def test_redirect_caseworkers_to_templates(
    client_request,
    mocker,
    active_caseworking_user,
):
    mocker.patch("app.user_api_client.get_user", return_value=active_caseworking_user)
    client_request.login(active_caseworking_user)
    client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
        _expected_status=302,
        _expected_redirect=url_for(
            "main.choose_template",
            service_id=SERVICE_ONE_ID,
        ),
    )


# TODO: Remove this test when FF_SAMPLE_TEMPLATES is removed
@pytest.mark.parametrize(
    "permissions, text_in_page, text_not_in_page",
    [
        (["view_activity", "manage_templates"], ["Create template"], ["Select template"]),
        (["view_activity", "send_messages"], ["Select template"], ["Create template"]),
        (["view_activity"], [], ["Create template", "Select template"]),
        (["view_activity", "manage_templates", "send_messages"], ["Create template", "Select template"], []),
    ],
)
def test_task_shortcuts_are_visible_based_on_permissions_REMOVE_FF(
    client_request: ClientRequest,
    active_user_with_permissions,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    permissions: list,
    text_in_page: list,
    text_not_in_page: list,
    app_,
):
    with set_config(app_, "FF_SAMPLE_TEMPLATES", False):
        active_user_with_permissions["permissions"][SERVICE_ONE_ID] = permissions
        client_request.login(active_user_with_permissions)

        page = client_request.get(
            "main.service_dashboard",
            service_id=SERVICE_ONE_ID,
        )

        for text in text_in_page:
            assert text in page.text

        for text in text_not_in_page:
            assert text not in page.text


@pytest.mark.parametrize(
    "permissions, text_in_page, text_not_in_page",
    [
        # Choose template, Create template, Explore
        (["view_activity", "manage_templates", "send_messages"], ["Choose template", "Explore"], ["Create template"]),
        (["view_activity", "manage_templates"], ["Choose template", "Explore"], ["Create template"]),
        (["view_activity", "send_messages"], ["Choose template"], ["Create template", "Explore"]),
        (["view_activity"], [], ["Create template", "Choose template", "Explore"]),
    ],
)
def test_task_shortcuts_are_visible_based_on_permissions_with_templates(
    client_request: ClientRequest,
    active_user_with_permissions,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    permissions: list,
    text_in_page: list,
    text_not_in_page: list,
    app_,
):
    with set_config(app_, "FF_SAMPLE_TEMPLATES", True):
        active_user_with_permissions["permissions"][SERVICE_ONE_ID] = permissions
        client_request.login(active_user_with_permissions)

        page = client_request.get(
            "main.service_dashboard",
            service_id=SERVICE_ONE_ID,
        )

        for text in text_in_page:
            assert text in page.text

        for text in text_not_in_page:
            assert text not in page.text


@pytest.mark.parametrize(
    "permissions, text_in_page, text_not_in_page",
    [
        # Choose template, Create template, Explore
        (["view_activity", "manage_templates", "send_messages"], ["Create template", "Explore"], ["Choose template"]),
        (["view_activity", "manage_templates"], ["Create template", "Explore"], ["Choose template"]),
        (["view_activity", "send_messages"], [], ["Create template", "Choose template", "Explore"]),
        (["view_activity"], [], ["Create template", "Choose template", "Explore"]),
    ],
)
def test_task_shortcuts_are_visible_based_on_permissions_with_no_templates(
    client_request: ClientRequest,
    active_user_with_permissions,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    permissions: list,
    text_in_page: list,
    text_not_in_page: list,
    app_,
):
    with set_config(app_, "FF_SAMPLE_TEMPLATES", True):
        active_user_with_permissions["permissions"][SERVICE_ONE_ID] = permissions
        client_request.login(active_user_with_permissions)

        page = client_request.get(
            "main.service_dashboard",
            service_id=SERVICE_ONE_ID,
        )

        for text in text_in_page:
            assert text in page.text

        for text in text_not_in_page:
            assert text not in page.text


@pytest.mark.parametrize(
    "admin_url, is_widget_present",
    [
        ("http://localhost:6012", True),
        ("https://staging.notification.cdssandbox.xyz", True),
        ("https://notification.canada.ca", True),
    ],
)
def test_survey_widget_presence(
    client_request: ClientRequest,
    active_user_with_permissions,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mocker,
    admin_url,
    is_widget_present,
):
    mocker.patch.dict("app.current_app.config", values={"ADMIN_BASE_URL": admin_url})
    active_user_with_permissions["permissions"][SERVICE_ONE_ID] = ["view_activity", "manage_templates"]
    client_request.login(active_user_with_permissions)

    page = client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
    )

    widget = page.select_one("#ZN_2nHmsSE63l43P0y")  # find by the qualtrics survey ID
    assert bool(widget) == is_widget_present


def test_sending_link_has_query_param(
    client_request: ClientRequest,
    active_user_with_permissions,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
):
    active_user_with_permissions["permissions"][SERVICE_ONE_ID] = ["view_activity", "send_messages"]
    client_request.login(active_user_with_permissions)

    page = client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
    )
    sending_url = url_for("main.choose_template", service_id=SERVICE_ONE_ID, view="sending")
    assert sending_url == page.select_one(".dashboard .border a").attrs["href"]


def test_no_sending_link_if_no_templates(
    client_request: ClientRequest,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
):
    page = client_request.get("main.service_dashboard", service_id=SERVICE_ONE_ID)

    assert url_for("main.choose_template", service_id=SERVICE_ONE_ID, view="sending") not in str(page)
    assert "Reuse a message you’ve already created." not in str(page)


def test_should_show_recent_templates_on_dashboard(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
    app_,
):
    mock_template_stats = mocker.patch(
        "app.template_statistics_client.get_template_statistics_for_service",
        return_value=copy.deepcopy(stub_template_stats),
    )

    page = client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
    )

    mock_template_stats.assert_any_call(SERVICE_ONE_ID, limit_days=7)
    mock_template_stats.assert_any_call(SERVICE_ONE_ID, limit_days=1)

    headers = [header.text.strip() for header in page.find_all("h2") + page.find_all("h1")]

    assert "Sent in the last week" in headers

    table_rows = page.find_all("tbody")[1].find_all("tr")

    assert len(table_rows) == 2

    assert "two" in table_rows[0].find_all("th")[0].text
    assert "Email template" in table_rows[0].find_all("th")[0].text
    assert "200" in table_rows[0].find_all("td")[0].text

    assert "one" in table_rows[1].find_all("th")[0].text
    assert "Text message template" in table_rows[1].find_all("th")[0].text
    assert "100" in table_rows[1].find_all("td")[0].text


@freeze_time("2016-07-01 12:00")  # 4 months into 2016 fiscal year
@pytest.mark.parametrize(
    "extra_args",
    [
        {},
        {"year": "2016"},
    ],
)
def test_should_show_redirect_from_template_history(
    client_request,
    extra_args,
):
    client_request.get(
        "main.template_history",
        service_id=SERVICE_ONE_ID,
        _expected_status=301,
        **extra_args,
    )


@freeze_time("2016-07-01 12:00")  # 4 months into 2016 fiscal year
@pytest.mark.parametrize(
    "extra_args, template_label",
    [
        ({}, "Text message template "),
        ({"year": "2016"}, "Text message template "),
        ({"lang": "fr"}, "Gabarit message texte "),
    ],
)
def test_should_show_monthly_breakdown_of_template_usage(
    client_request,
    mock_get_monthly_template_usage,
    extra_args,
    template_label,
):
    page = client_request.get("main.template_usage", service_id=SERVICE_ONE_ID, **extra_args)

    mock_get_monthly_template_usage.assert_called_once_with(SERVICE_ONE_ID, 2016)

    table_rows = page.select("tbody tr")

    assert " ".join(table_rows[0].text.split()) == ("My first template " + template_label + "2")

    assert len(table_rows) == len(["April"])
    assert len(page.select(".table-no-data")) == len(["May", "June", "July"])


def test_anyone_can_see_monthly_breakdown(
    client, api_user_active, service_one, mocker, mock_get_monthly_notification_stats, mock_get_service_statistics
):
    mocker.patch("app.main.views.dashboard.annual_limit_client.get_all_notification_counts", return_value={"data": service_one})
    validate_route_permission_with_client(
        mocker,
        client,
        "GET",
        200,
        url_for("main.monthly", service_id=service_one["id"]),
        ["view_activity"],
        api_user_active,
        service_one,
    )


def test_monthly_shows_letters_in_breakdown(
    client_request, service_one, mocker, mock_get_monthly_notification_stats, mock_get_service_statistics
):
    mocker.patch("app.main.views.dashboard.annual_limit_client.get_all_notification_counts", return_value={"data": service_one})
    page = client_request.get("main.monthly", service_id=service_one["id"])

    columns = page.select(".table-field-left-aligned .big-number-label")

    assert normalize_spaces(columns[2].text) == "emails"
    assert normalize_spaces(columns[3].text) == "text messages"


@pytest.mark.parametrize(
    "endpoint",
    [
        "main.monthly",
        "main.template_usage",
    ],
)
@freeze_time("2015-01-01 15:15:15.000000")
def test_stats_pages_show_last_3_years(
    client_request,
    endpoint,
    service_one,
    mocker,
    mock_get_monthly_notification_stats,
    mock_get_monthly_template_usage,
    mock_get_service_statistics,
):
    mocker.patch("app.main.views.dashboard.annual_limit_client.get_all_notification_counts", return_value={"data": service_one})
    page = client_request.get(
        endpoint,
        service_id=SERVICE_ONE_ID,
    )

    assert normalize_spaces(page.select_one(".pill").text) == (
        "2012 to 2013 fiscal year " "2013 to 2014 fiscal year " "2014 to 2015 fiscal year"
    )


def test_monthly_has_equal_length_tables(
    client_request, service_one, mocker, mock_get_monthly_notification_stats, mock_get_service_statistics
):
    mocker.patch("app.main.views.dashboard.annual_limit_client.get_all_notification_counts", return_value={"data": service_one})
    page = client_request.get("main.monthly", service_id=service_one["id"])

    assert page.select_one(".table-field-headings th")["style"] == "width: 33%"


@freeze_time("2016-01-01 11:09:00.061258")
# This test assumes EST
def test_should_show_upcoming_jobs_on_dashboard(
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_usage,
    mock_get_inbound_sms_summary,
):
    page = client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
    )

    first_call = mock_get_jobs.call_args_list[0]
    assert first_call[0] == (SERVICE_ONE_ID,)
    assert first_call[1]["statuses"] == ["scheduled"]

    table_rows = page.find_all("tbody")[0].find_all("tr")
    assert len(table_rows) == 2

    assert "send_me_later.csv" in table_rows[0].find_all("th")[0].text
    assert "Starting 2016-01-01 11:09:00.061258" in table_rows[0].find_all("th")[0].text
    assert table_rows[0].find_all("td")[0].text.strip() == "Scheduled to send to 30 recipients"
    assert "even_later.csv" in table_rows[1].find_all("th")[0].text
    assert "Starting 2016-01-01 23:09:00.061258" in table_rows[1].find_all("th")[0].text
    assert table_rows[1].find_all("td")[0].text.strip() == "Scheduled to send to 30 recipients"


def test_daily_usage_section_shown(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    app_,
):
    page = client_request.get(
        "main.service_dashboard",
        service_id=service_one["id"],
    )
    headings = [element.text.strip() for element in page.find_all("h2")]
    big_number_labels = [element.text.strip() for element in page.select(".big-number-label")]

    assert "Usage today" not in headings
    assert "text messages  left today" not in big_number_labels


@pytest.mark.parametrize(
    "permissions, totals, big_number_class, expected_column_count",
    [
        (
            ["email", "sms"],
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 999999999, "delivered": 0, "failed": 0},
            },
            ".big-number",
            3,
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 1000000000, "delivered": 0, "failed": 0},
                "sms": {"requested": 1000000, "delivered": 0, "failed": 0},
            },
            ".big-number-dark",
            3,
        ),
    ],
)
def test_correct_font_size_for_big_numbers(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    permissions,
    totals,
    big_number_class,
    expected_column_count,
    app_,
):
    service_one["permissions"] = permissions

    mocker.patch("app.main.views.dashboard.get_dashboard_totals", return_value=totals)

    page = client_request.get(
        "main.service_dashboard",
        service_id=service_one["id"],
    )

    assert expected_column_count == len(page.select(".big-number-with-status {}".format(big_number_class)))


@pytest.mark.parametrize(
    "permissions, totals, expected_big_numbers_single_plural, lang",
    [
        (
            ["email", "sms"],
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 0, "delivered": 0, "failed": 0},
            },
            (
                "0 emails sent emails sent: No failures",
                "0 text messages sent text messages sent: No failures",
                "0 problem email addresses No problem addresses",
            ),
            "en",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 0, "delivered": 0, "failed": 0},
            },
            (
                "0 courriel envoyé courriel envoyé: Aucun échec",
                "0 message texte envoyé message texte envoyé: Aucun échec",
                "0 addresse courriel problématique Aucune adresse problématique",
            ),
            "fr",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 1, "delivered": 1, "failed": 0},
                "sms": {"requested": 1, "delivered": 1, "failed": 0},
            },
            (
                "1 email sent email sent: No failures",
                "1 text message sent text message sent: No failures",
                "0 problem email addresses No problem addresses",
            ),
            "en",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 1, "delivered": 1, "failed": 0},
                "sms": {"requested": 1, "delivered": 1, "failed": 0},
            },
            (
                "1 courriel envoyé courriel envoyé: Aucun échec",
                "1 message texte envoyé message texte envoyé: Aucun échec",
                "0 addresse courriel problématique Aucune adresse problématique",
            ),
            "fr",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 2, "delivered": 2, "failed": 0},
                "sms": {"requested": 2, "delivered": 2, "failed": 0},
            },
            (
                "2 emails sent emails sent: No failures",
                "2 text messages sent text messages sent: No failures",
                "0 problem email addresses No problem addresses",
            ),
            "en",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 2, "delivered": 2, "failed": 0},
                "sms": {"requested": 2, "delivered": 2, "failed": 0},
            },
            (
                "2 courriels envoyés courriels envoyés: Aucun échec",
                "2 messages texte envoyés messages texte envoyés: Aucun échec",
                "0 addresse courriel problématique Aucune adresse problématique",
            ),
            "fr",
        ),
    ],
)
def test_dashboard_single_and_plural_v15(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    permissions,
    totals,
    expected_big_numbers_single_plural,
    lang,
    app_,
):
    service_one["permissions"] = permissions

    mocker.patch("app.main.views.dashboard.get_dashboard_totals", return_value=totals)

    page = client_request.get("main.service_dashboard", service_id=service_one["id"], lang=lang)

    assert (
        normalize_spaces(page.select(".big-number-with-status")[0].text),
        normalize_spaces(page.select(".big-number-with-status")[1].text),
        normalize_spaces(page.select(".big-number-with-status")[2].text),
    ) == expected_big_numbers_single_plural


@freeze_time("2016-01-01 11:09:00.061258")
# This test assumes EST
def test_should_show_recent_jobs_on_dashboard(
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_usage,
    mock_get_inbound_sms_summary,
):
    page = client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
    )

    second_call = mock_get_jobs.call_args_list[1]
    assert second_call[0] == (SERVICE_ONE_ID,)
    assert second_call[1]["limit_days"] == 7
    assert "scheduled" not in second_call[1]["statuses"]

    table_rows = page.find_all("tbody")[2].find_all("tr")

    assert len(table_rows) == 4

    for index, filename in enumerate(
        (
            "export 1/1/2016.xls",
            "all email addresses.xlsx",
            "applicants.ods",
            "thisisatest.csv",
        )
    ):
        assert filename in table_rows[index].find_all("th")[0].text
        assert "2016-01-01T11:09:00.061258+0000" in table_rows[index].find_all("th")[0].text
        for column_index, count in enumerate((30, 0, 0)):
            assert table_rows[index].find_all("td")[column_index].text.strip() == str(count)


@freeze_time("2012-03-31 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_usage_page(
    client_request,
    mock_get_usage,
    mock_get_billable_units,
    mock_get_free_sms_fragment_limit,
):
    page = client_request.get(
        "main.usage",
        service_id=SERVICE_ONE_ID,
    )

    mock_get_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_usage.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2011)

    cols = page.find_all("div", {"class": "w-1\\/2"})
    nav = page.find("ul", {"class": "pill", "role": "nav"})
    nav_links = nav.find_all("a")

    assert normalize_spaces(nav_links[0].text) == "2010 to 2011 fiscal year"
    assert normalize_spaces(nav.find("li", {"aria-selected": "true"}).text) == "2011 to 2012 fiscal year"
    assert normalize_spaces(nav["aria-label"]) == "Filter by year"
    assert "252,190" in cols[1].text
    assert "Text messages" in cols[1].text

    table = page.find("table").text.strip()

    assert "249,860 free text messages" in table
    assert "40 free text messages" in table
    assert "960 text messages at 1.65p" in table
    assert "April" in table
    assert "February" in table
    assert "March" in table
    assert "£15.84" in table
    assert "140 free text messages" in table
    assert "£20.30" in table
    assert "1,230 text messages at 1.65p" in table


@freeze_time("2012-03-31 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_usage_page_with_letters(
    client_request,
    service_one,
    mock_get_usage,
    mock_get_billable_units,
    mock_get_free_sms_fragment_limit,
):
    service_one["permissions"].append("letter")
    page = client_request.get(
        "main.usage",
        service_id=SERVICE_ONE_ID,
    )

    mock_get_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_usage.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2011)

    cols = page.find_all("div", {"class": "md\\:w-1\\/3"})
    nav = page.find("ul", {"class": "pill", "role": "nav"})
    nav_links = nav.find_all("a")

    assert normalize_spaces(nav_links[0].text) == "2010 to 2011 fiscal year"
    assert normalize_spaces(nav.find("li", {"aria-selected": "true"}).text) == "2011 to 2012 fiscal year"
    assert normalize_spaces(nav_links[1].text) == "2012 to 2013 fiscal year"
    assert normalize_spaces(nav["aria-label"]) == "Filter by year"

    assert "252,190" in cols[1].text
    assert "Text messages" in cols[1].text

    table = page.find("table").text.strip()

    assert "249,860 free text messages" in table
    assert "40 free text messages" in table
    assert "960 text messages at 1.65p" in table
    assert "April" in table
    assert "February" in table
    assert "March" in table
    assert "£20.59" in table
    assert "140 free text messages" in table
    assert "£20.30" in table
    assert "1,230 text messages at 1.65p" in table
    assert "10 second class letters at 31p" in normalize_spaces(table)
    assert "5 first class letters at 33p" in normalize_spaces(table)


@freeze_time("2012-04-30 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_usage_page_displays_letters_ordered_by_postage(
    mocker,
    client_request,
    service_one,
    mock_get_usage,
    mock_get_free_sms_fragment_limit,
):
    billable_units_resp = [
        {
            "month": "April",
            "notification_type": "letter",
            "rate": 0.5,
            "billing_units": 1,
            "postage": "second",
        },
        {
            "month": "April",
            "notification_type": "letter",
            "rate": 0.3,
            "billing_units": 3,
            "postage": "second",
        },
        {
            "month": "April",
            "notification_type": "letter",
            "rate": 0.5,
            "billing_units": 1,
            "postage": "first",
        },
    ]
    mocker.patch("app.billing_api_client.get_billable_units", return_value=billable_units_resp)
    service_one["permissions"].append("letter")
    page = client_request.get(
        "main.usage",
        service_id=SERVICE_ONE_ID,
    )

    row_for_april = page.find("table").find("tr", class_="table-row")
    postage_details = row_for_april.find_all("li", class_="tabular-numbers")

    assert len(postage_details) == 3
    assert normalize_spaces(postage_details[0].text) == "1 first class letter at 50p"
    assert normalize_spaces(postage_details[1].text) == "3 second class letters at 30p"
    assert normalize_spaces(postage_details[2].text) == "1 second class letter at 50p"


@pytest.mark.skip(reason="feature not in use")
def test_usage_page_with_year_argument(
    logged_in_client,
    mock_get_usage,
    mock_get_billable_units,
    mock_get_free_sms_fragment_limit,
):
    assert logged_in_client.get(url_for("main.usage", service_id=SERVICE_ONE_ID, year=2000)).status_code == 200
    mock_get_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2000)
    mock_get_usage.assert_called_once_with(SERVICE_ONE_ID, 2000)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2000)


@pytest.mark.skip(reason="feature not in use")
def test_usage_page_for_invalid_year(
    client_request,
):
    client_request.get(
        "main.usage",
        service_id=SERVICE_ONE_ID,
        year="abcd",
        _expected_status=404,
    )


@freeze_time("2012-03-31 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_future_usage_page(
    client_request,
    mock_get_future_usage,
    mock_get_future_billable_units,
    mock_get_free_sms_fragment_limit,
):
    client_request.get(
        "main.usage",
        service_id=SERVICE_ONE_ID,
        year=2014,
    )

    mock_get_future_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2014)
    mock_get_future_usage.assert_called_once_with(SERVICE_ONE_ID, 2014)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2014)


def _test_dashboard_menu(mocker, app_, usr, service, permissions):
    with app_.test_request_context():
        with app_.test_client() as client:
            usr["permissions"][str(service["id"])] = permissions
            usr["services"] = [service["id"]]
            mocker.patch("app.user_api_client.check_verify_code", return_value=(True, ""))
            mocker.patch("app.service_api_client.get_services", return_value={"data": [service]})
            mocker.patch("app.user_api_client.get_user", return_value=usr)
            mocker.patch("app.user_api_client.get_user_by_email", return_value=usr)
            mocker.patch("app.service_api_client.get_service", return_value={"data": service})
            client.login(usr)
            return client.get(url_for("main.service_dashboard", service_id=service["id"]))


def test_menu_send_messages(
    mocker,
    app_,
    api_user_active,
    service_one,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
    mock_get_free_sms_fragment_limit,
):
    service_one["permissions"] = ["email", "sms", "letter", "upload_letters"]

    with app_.test_request_context():
        resp = _test_dashboard_menu(
            mocker,
            app_,
            api_user_active,
            service_one,
            ["view_activity", "send_messages"],
        )
        page = resp.get_data(as_text=True)
        assert (
            url_for(
                "main.choose_template",
                service_id=service_one["id"],
            )
            in page
        )
        assert url_for("main.manage_users", service_id=service_one["id"]) in page

        url_service_settings = url_for("main.service_settings", service_id=service_one["id"])
        assert f'"{url_service_settings}"' not in page
        assert url_for("main.api_keys", service_id=service_one["id"]) not in page
        assert url_for("main.view_providers") not in page


def test_menu_send_messages_when_service_does_not_have_upload_letters_permission(
    mocker,
    app_,
    api_user_active,
    service_one,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
    mock_get_free_sms_fragment_limit,
):
    with app_.test_request_context():
        resp = _test_dashboard_menu(
            mocker,
            app_,
            api_user_active,
            service_one,
            ["view_activity", "send_messages"],
        )
        page = resp.get_data(as_text=True)
        assert url_for("main.uploads", service_id=service_one["id"]) not in page


def test_menu_manage_service(
    mocker,
    app_,
    api_user_active,
    service_one,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
    mock_get_free_sms_fragment_limit,
):
    with app_.test_request_context():
        resp = _test_dashboard_menu(
            mocker,
            app_,
            api_user_active,
            service_one,
            ["view_activity", "manage_templates", "manage_service"],
        )
        page = resp.get_data(as_text=True)
        assert (
            url_for(
                "main.choose_template",
                service_id=service_one["id"],
            )
            in page
        )
        assert url_for("main.manage_users", service_id=service_one["id"]) in page
        assert url_for("main.service_settings", service_id=service_one["id"]) in page

        assert url_for("main.api_keys", service_id=service_one["id"]) not in page


def test_menu_manage_api_keys(
    mocker,
    app_,
    api_user_active,
    service_one,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
    mock_get_free_sms_fragment_limit,
):
    with app_.test_request_context():
        resp = _test_dashboard_menu(
            mocker,
            app_,
            api_user_active,
            service_one,
            ["view_activity", "manage_api_keys"],
        )

        page = resp.get_data(as_text=True)

        assert (
            url_for(
                "main.choose_template",
                service_id=service_one["id"],
            )
            in page
        )
        assert url_for("main.manage_users", service_id=service_one["id"]) in page
        assert url_for("main.service_settings", service_id=service_one["id"]) in page
        assert url_for("main.api_integration", service_id=service_one["id"]) in page


def test_menu_all_services_for_platform_admin_user(
    mocker,
    app_,
    platform_admin_user,
    service_one,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
    mock_get_free_sms_fragment_limit,
):
    with app_.test_request_context():
        resp = _test_dashboard_menu(mocker, app_, platform_admin_user, service_one, [])
        page = resp.get_data(as_text=True)
        assert url_for("main.choose_template", service_id=service_one["id"]) in page
        assert url_for("main.manage_users", service_id=service_one["id"]) in page
        assert url_for("main.service_settings", service_id=service_one["id"]) in page
        assert (
            url_for(
                "main.view_notifications",
                service_id=service_one["id"],
                message_type="email",
            )
            in page
        )
        assert (
            url_for(
                "main.view_notifications",
                service_id=service_one["id"],
                message_type="sms",
            )
            in page
        )
        assert url_for("main.api_keys", service_id=service_one["id"]) not in page


def test_route_for_service_permissions(
    mocker,
    app_,
    api_user_active,
    service_one,
    mock_get_service,
    mock_get_user,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary,
):
    with app_.test_request_context():
        validate_route_permission(
            mocker,
            app_,
            "GET",
            200,
            url_for("main.service_dashboard", service_id=service_one["id"]),
            ["view_activity"],
            api_user_active,
            service_one,
        )


def test_aggregate_template_stats():
    expected = aggregate_template_usage(copy.deepcopy(stub_template_stats))
    assert len(expected) == 2
    assert expected[0]["template_name"] == "two"
    assert expected[0]["count"] == 200
    assert expected[0]["template_id"] == "id-2"
    assert expected[0]["template_type"] == "email"
    assert expected[1]["template_name"] == "one"
    assert expected[1]["count"] == 100
    assert expected[1]["template_id"] == "id-1"
    assert expected[1]["template_type"] == "sms"


def test_aggregate_notifications_stats():
    expected = aggregate_notifications_stats(copy.deepcopy(stub_template_stats))
    assert expected == {
        "sms": {"requested": 100, "delivered": 50, "failed": 0},
        "email": {"requested": 200, "delivered": 0, "failed": 100},
    }


def test_service_dashboard_updates_gets_dashboard_totals(
    mocker,
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_usage,
    mock_get_inbound_sms_summary,
):
    mocker.patch(
        "app.main.views.dashboard.get_dashboard_totals",
        return_value={
            "email": {"requested": 123, "delivered": 0, "failed": 0},
            "sms": {"requested": 456, "delivered": 0, "failed": 0},
        },
    )

    page = client_request.get(
        "main.service_dashboard",
        service_id=SERVICE_ONE_ID,
    )

    numbers = [number.text.strip() for number in page.find_all("div", class_="big-number-number")]
    assert "123" in numbers
    assert "456" in numbers


def test_get_dashboard_totals_adds_percentages():
    stats = {
        "sms": {"requested": 3, "delivered": 0, "failed": 2},
        "email": {"requested": 0, "delivered": 0, "failed": 0},
    }
    assert get_dashboard_totals(stats)["sms"]["failed_percentage"] == "66.7"
    assert get_dashboard_totals(stats)["email"]["failed_percentage"] == "0"


@pytest.mark.parametrize("failures,expected", [(2, False), (3, False), (4, True)])
def test_get_dashboard_totals_adds_warning(failures, expected):
    stats = {"sms": {"requested": 100, "delivered": 0, "failed": failures}}
    assert get_dashboard_totals(stats)["sms"]["show_warning"] == expected


def test_format_monthly_stats_empty_case():
    assert format_monthly_stats_to_list({}) == []


def test_format_monthly_stats_has_stats_with_failure_rate():
    resp = format_monthly_stats_to_list({"2016-07": {"sms": _stats(3, 1, 2)}})
    assert resp[0]["sms_counts"] == {
        "failed": 2,
        "failed_percentage": "66.7",
        "requested": 3,
        "show_warning": True,
    }


def test_format_monthly_stats_works_for_email_letter():
    resp = format_monthly_stats_to_list(
        {
            "2016-07": {
                "sms": {},
                "email": {},
                "letter": {},
            }
        }
    )
    assert isinstance(resp[0]["sms_counts"], dict)
    assert isinstance(resp[0]["email_counts"], dict)
    assert isinstance(resp[0]["letter_counts"], dict)


def _stats(requested, delivered, failed):
    return {"requested": requested, "delivered": delivered, "failed": failed}


@pytest.mark.parametrize(
    "dict_in, expected_failed, expected_requested",
    [
        ({}, 0, 0),
        (
            {"temporary-failure": 1, "permanent-failure": 1, "technical-failure": 1},
            3,
            3,
        ),
        (
            {"created": 1, "pending": 1, "sending": 1, "delivered": 1},
            0,
            4,
        ),
    ],
)
def test_aggregate_status_types(dict_in, expected_failed, expected_requested):
    sms_counts = aggregate_status_types({"sms": dict_in})["sms_counts"]
    assert sms_counts["failed"] == expected_failed
    assert sms_counts["requested"] == expected_requested


@pytest.mark.parametrize(
    "now, expected_number_of_months",
    [
        (freeze_time("2017-12-31 11:09:00.061258"), 12),
        (freeze_time("2017-01-01 11:09:00.061258"), 10),
    ],
)
def test_get_free_paid_breakdown_for_billable_units(now, expected_number_of_months):
    sms_allowance = 250000
    with now:
        billing_units = get_free_paid_breakdown_for_billable_units(
            2016,
            sms_allowance,
            [
                {
                    "month": "April",
                    "international": False,
                    "rate_multiplier": 1,
                    "notification_type": "sms",
                    "rate": 1.65,
                    "billing_units": 100000,
                },
                {
                    "month": "May",
                    "international": False,
                    "rate_multiplier": 1,
                    "notification_type": "sms",
                    "rate": 1.65,
                    "billing_units": 100000,
                },
                {
                    "month": "June",
                    "international": False,
                    "rate_multiplier": 1,
                    "notification_type": "sms",
                    "rate": 1.65,
                    "billing_units": 100000,
                },
                {
                    "month": "February",
                    "international": False,
                    "rate_multiplier": 1,
                    "notification_type": "sms",
                    "rate": 1.65,
                    "billing_units": 2000,
                },
            ],
        )
        assert (
            list(billing_units)
            == [
                {
                    "free": 100000,
                    "name": "April",
                    "paid": 0,
                },
                {
                    "free": 100000,
                    "name": "May",
                    "paid": 0,
                },
                {
                    "free": 50000,
                    "name": "June",
                    "paid": 50000,
                },
                {
                    "free": 0,
                    "name": "July",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "August",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "September",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "October",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "November",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "December",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "January",
                    "paid": 0,
                },
                {
                    "free": 0,
                    "name": "February",
                    "paid": 2000,
                },
                {
                    "free": 0,
                    "name": "March",
                    "paid": 0,
                },
            ][:expected_number_of_months]
        )


@pytest.mark.skip(reason="TODO: a11y test")
@pytest.mark.a11y
def test_dashboard_page_a11y(
    logged_in_client,
    mocker,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    mock_get_service_statistics,
    mock_get_usage,
):
    mocker.patch(
        "app.template_statistics_client.get_template_statistics_for_service",
        return_value=copy.deepcopy(stub_template_stats),
    )

    url = url_for("main.service_dashboard", service_id=SERVICE_ONE_ID)
    response = logged_in_client.get(url)

    assert response.status_code == 200
    a11y_test(url, response.data.decode("utf-8"))


def test_a11y_template_usage_should_not_contain_duplicate_ids(
    client_request,
    mock_get_monthly_template_usage_with_multiple_months,
):
    page = client_request.get("main.template_usage", service_id=SERVICE_ONE_ID, year=2023)

    list = []
    for element in page.findAll("tr", {"id": re.compile(r".*")}):
        list.append(element["id"])

    assert len(list) == len(set(list))  # check for duplicates


@pytest.mark.parametrize(
    "totals, notification_type, expected_color, expected_sent, expected_limit, expect_accessible_message",
    [
        # With a service email limit of 1000, and 100 emails sent in the past 24 hours
        (
            {
                "email": {"requested": 100, "delivered": 0, "failed": 0},
                "sms": {"requested": 0, "delivered": 0, "failed": 0},
            },
            "email",
            "text-green-300",
            "100",
            "1,000",
            False,
        ),
        # With a service SMS limit of 1000, and 10 sms sent in the past 24 hours
        (
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 10, "delivered": 0, "failed": 0},
            },
            "sms",
            "text-green-300",
            "10",
            "1,000",
            False,
        ),
        # With a service email limit of 1000, and 800 emails sent in the past 24 hours
        (
            {
                "email": {"requested": 800, "delivered": 0, "failed": 0},
                "sms": {"requested": 0, "delivered": 0, "failed": 0},
            },
            "email",
            "text-red-300",
            "800",
            "1,000",
            True,
        ),
        # With a service SMS limit of 1000, and 900 sms sent in the past 24 hours
        (
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 900, "delivered": 0, "failed": 0},
            },
            "sms",
            "text-red-300",
            "900",
            "1,000",
            True,
        ),
        # With a service email limit of 1000, and 1000 emails sent in the past 24 hours
        (
            {
                "email": {"requested": 1000, "delivered": 0, "failed": 0},
                "sms": {"requested": 0, "delivered": 0, "failed": 0},
            },
            "email",
            "text-red-300",
            "1,000",
            "1,000",
            True,
        ),
        # With a service SMS limit of 1000, and 1000 sms sent in the past 24 hours
        (
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 1000, "delivered": 0, "failed": 0},
            },
            "sms",
            "text-red-300",
            "1,000",
            "1,000",
            True,
        ),
    ],
)
def test_dashboard_daily_limits(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    totals,
    notification_type,
    expected_color,
    expected_sent,
    expected_limit,
    expect_accessible_message,
    app_,
):
    service_one["permissions"] = (["email", "sms"],)

    mocker.patch("app.main.views.dashboard.get_dashboard_totals", return_value=totals)

    page = client_request.get("main.service_dashboard", service_id=service_one["id"])

    component_index = 0 if notification_type == "email" else 1

    assert page.find_all(class_="remaining-messages")[component_index].find(class_="rm-used").text == expected_sent
    assert page.find_all(class_="remaining-messages")[component_index].find(class_="rm-total").text[3:] == expected_limit
    assert (
        expected_color in page.find_all(class_="remaining-messages")[component_index].find(class_="rm-bar-usage").attrs["class"]
    )

    if expect_accessible_message:
        assert (
            len(
                page.find_all(class_="remaining-messages")[component_index]
                .find(class_="rm-message")
                .find_all(class_="visually-hidden")
            )
            == 2
        )


class TestAnnualLimits:
    def test_daily_usage_uses_muted_component(
        self,
        logged_in_client,
        mocker,
        mock_get_service_templates_when_no_templates_exist,
        mock_get_jobs,
        mock_get_service_statistics,
        mock_get_usage,
        app_,
    ):
        with set_config(app_, "FF_ANNUAL_LIMIT", True):  # REMOVE LINE WHEN FF REMOVED
            mocker.patch(
                "app.template_statistics_client.get_template_statistics_for_service",
                return_value=copy.deepcopy(stub_template_stats),
            )

            url = url_for("main.service_dashboard", service_id=SERVICE_ONE_ID)
            response = logged_in_client.get(url)
            page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

            # ensure both email + sms widgets are muted
            assert len(page.select("[data-testid='daily-usage'] .remaining-messages.muted")) == 2

    def test_annual_usage_uses_muted_component(
        self,
        logged_in_client,
        mocker,
        mock_get_service_templates_when_no_templates_exist,
        mock_get_jobs,
        mock_get_service_statistics,
        mock_get_usage,
        app_,
    ):
        with set_config(app_, "FF_ANNUAL_LIMIT", True):  # REMOVE LINE WHEN FF REMOVED
            mocker.patch(
                "app.template_statistics_client.get_template_statistics_for_service",
                return_value=copy.deepcopy(stub_template_stats),
            )

            url = url_for("main.service_dashboard", service_id=SERVICE_ONE_ID)
            response = logged_in_client.get(url)
            page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

            # ensure both email + sms widgets are muted
            assert len(page.select("[data-testid='annual-usage'] .remaining-messages.muted")) == 2

    @freeze_time("2024-11-25 12:12:12")
    @pytest.mark.parametrize(
        "redis_daily_data, monthly_data, expected_data",
        [
            (
                {"sms_delivered": 100, "email_delivered": 50, "sms_failed": 1000, "email_failed": 500},
                {
                    "data": {
                        "2024-04": {"sms": {}, "email": {}, "letter": {}},
                        "2024-05": {"sms": {}, "email": {}, "letter": {}},
                        "2024-06": {"sms": {}, "email": {}, "letter": {}},
                        "2024-07": {"sms": {}, "email": {}, "letter": {}},
                        "2024-08": {"sms": {}, "email": {}, "letter": {}},
                        "2024-09": {"sms": {}, "email": {}, "letter": {}},
                        "2024-10": {
                            "sms": {"delivered": 5, "permanent-failure": 50, "sending": 5, "technical-failure": 100},
                            "email": {"delivered": 10, "permanent-failure": 110, "sending": 50, "technical-failure": 50},
                            "letter": {},
                        },
                        "2024-11": {
                            "sms": {"delivered": 5, "permanent-failure": 50, "sending": 5, "technical-failure": 100},
                            "email": {"delivered": 10, "permanent-failure": 110, "sending": 50, "technical-failure": 50},
                            "letter": {},
                        },
                    }
                },
                {"email": 990, "letter": 0, "sms": 1420},
            ),
            (
                {"sms_delivered": 6, "email_delivered": 6, "sms_failed": 6, "email_failed": 6},
                {
                    "data": {
                        "2024-10": {
                            "sms": {"delivered": 6, "permanent-failure": 6, "sending": 6, "technical-failure": 6},
                            "email": {"delivered": 6, "permanent-failure": 6, "sending": 6, "technical-failure": 6},
                            "letter": {},
                        },
                    }
                },
                {"email": 36, "letter": 0, "sms": 36},
            ),
        ],
    )
    def test_usage_report_aggregates_calculated_properly_with_redis(
        self,
        logged_in_client,
        mocker,
        mock_get_service_templates_when_no_templates_exist,
        mock_get_jobs,
        mock_get_service_statistics,
        mock_get_usage,
        app_,
        redis_daily_data,
        monthly_data,
        expected_data,
    ):
        with set_config(app_, "FF_ANNUAL_LIMIT", True):  # REMOVE LINE WHEN FF REMOVED
            # mock annual_limit_client.get_all_notification_counts
            mocker.patch(
                "app.main.views.dashboard.annual_limit_client.get_all_notification_counts",
                return_value=redis_daily_data,
            )

            mocker.patch(
                "app.service_api_client.get_monthly_notification_stats",
                return_value=copy.deepcopy(monthly_data),
            )

            mock_render_template = mocker.patch("app.main.views.dashboard.render_template")

            url = url_for("main.monthly", service_id=SERVICE_ONE_ID)
            logged_in_client.get(url)

            mock_render_template.assert_called_with(
                ANY, months=ANY, years=ANY, annual_data=expected_data, selected_year=ANY, current_financial_year=ANY
            )

    @freeze_time("2024-11-25 12:12:12")
    @pytest.mark.parametrize(
        "daily_data, monthly_data, expected_data",
        [
            (
                {
                    "sms": {"requested": 100, "delivered": 50, "failed": 50},
                    "email": {"requested": 100, "delivered": 50, "failed": 50},
                    "letter": {"requested": 0, "delivered": 0, "failed": 0},
                },
                {
                    "data": {
                        "2024-04": {"sms": {}, "email": {}, "letter": {}},
                        "2024-05": {"sms": {}, "email": {}, "letter": {}},
                        "2024-06": {"sms": {}, "email": {}, "letter": {}},
                        "2024-07": {"sms": {}, "email": {}, "letter": {}},
                        "2024-08": {"sms": {}, "email": {}, "letter": {}},
                        "2024-09": {"sms": {}, "email": {}, "letter": {}},
                        "2024-10": {
                            "sms": {"delivered": 5, "permanent-failure": 50, "sending": 5, "technical-failure": 100},
                            "email": {"delivered": 10, "permanent-failure": 110, "sending": 50, "technical-failure": 50},
                            "letter": {},
                        },
                        "2024-11": {
                            "sms": {"delivered": 5, "permanent-failure": 50, "sending": 5, "technical-failure": 100},
                            "email": {"delivered": 10, "permanent-failure": 110, "sending": 50, "technical-failure": 50},
                            "letter": {},
                        },
                    }
                },
                {"email": 540, "letter": 0, "sms": 420},
            )
        ],
    )
    def test_usage_report_aggregates_calculated_properly_without_redis(
        self,
        logged_in_client,
        mocker,
        mock_get_service_templates_when_no_templates_exist,
        mock_get_jobs,
        mock_get_service_statistics,
        mock_get_usage,
        app_,
        daily_data,
        monthly_data,
        expected_data,
    ):
        with set_config(app_, "FF_ANNUAL_LIMIT", True):  # REMOVE LINE WHEN FF REMOVED
            # mock annual_limit_client.get_all_notification_counts
            mocker.patch(
                "app.main.views.dashboard.annual_limit_client.get_all_notification_counts",
                return_value={"sms_delivered": 0, "email_delivered": 0, "sms_failed": 0, "email_failed": 0},
            )

            mocker.patch(
                "app.service_api_client.get_service_statistics",
                return_value=copy.deepcopy(daily_data),
            )

            mocker.patch(
                "app.service_api_client.get_monthly_notification_stats",
                return_value=copy.deepcopy(monthly_data),
            )

            mock_render_template = mocker.patch("app.main.views.dashboard.render_template")

            url = url_for("main.monthly", service_id=SERVICE_ONE_ID)
            logged_in_client.get(url)

            mock_render_template.assert_called_with(
                ANY, months=ANY, years=ANY, annual_data=expected_data, selected_year=ANY, current_financial_year=ANY
            )


class TestGetAnnualData:
    @pytest.fixture
    def mock_service_id(self):
        return "service-id-12345"

    @pytest.fixture
    def mock_dashboard_totals_daily(self):
        """Dashboard totals fixture for daily statistics"""
        return {
            "sms": {"requested": 10, "failed": 2, "failed_percentage": "20.0%", "show_warning": True},
            "email": {"requested": 20, "failed": 1, "failed_percentage": "5.0%", "show_warning": True},
        }

    @pytest.mark.parametrize(
        "redis_enabled,was_seeded_today",
        [
            (False, True),  # Redis not enabled
            (True, False),  # Redis enabled but not seeded today
        ],
    )
    def test_get_annual_data_when_redis_not_available(
        self, mocker, mock_service_id, mock_dashboard_totals_daily, redis_enabled, was_seeded_today, app_
    ):
        """Test getting annual data when Redis is not enabled or not seeded today"""
        # Configure mocks
        with app_.app_context():
            mocker.patch.dict("app.main.views.dashboard.current_app.config", {"REDIS_ENABLED": redis_enabled})
        mock_annual_limit_client = mocker.patch("app.main.views.dashboard.annual_limit_client")
        mock_annual_limit_client.was_seeded_today.return_value = was_seeded_today

        mock_annual_data = {
            "data": {
                "2023-04": {
                    "sms": {"requested": 30, "delivered": 28, "failed": 2},
                    "email": {"requested": 40, "delivered": 38, "failed": 2},
                }
            }
        }
        mock_service_api_client = mocker.patch("app.main.views.dashboard.service_api_client")
        mock_service_api_client.get_monthly_notification_stats.return_value = mock_annual_data

        # Mock the aggregate function and current financial year
        mock_aggregate = mocker.patch("app.main.views.dashboard.aggregate_by_type_daily", return_value={"sms": 40, "email": 60})
        mocker.patch("app.main.views.dashboard.get_current_financial_year", return_value=2023)

        # Call function
        result = get_annual_data(mock_service_id, mock_dashboard_totals_daily)

        # Check API was called
        mock_service_api_client.get_monthly_notification_stats.assert_called_once_with(mock_service_id, 2023)

        # Check aggregate function was called
        mock_aggregate.assert_called_once_with(mock_annual_data, mock_dashboard_totals_daily)

        # Verify result
        assert result == {"sms": 40, "email": 60}

    def test_get_annual_data_from_redis(self, mocker, mock_service_id, mock_dashboard_totals_daily, app_):
        """Test getting annual data from Redis when enabled and seeded"""
        with app_.app_context():
            # Configure mocks
            mocker.patch.dict("app.main.views.dashboard.current_app.config", {"REDIS_ENABLED": True})
            mock_annual_limit_client = mocker.patch("app.main.views.dashboard.annual_limit_client")
            mock_annual_limit_client.was_seeded_today.return_value = True
            mock_annual_limit_client.get_all_notification_counts.return_value = {
                "total_sms_fiscal_year_to_yesterday": 100,
                "total_email_fiscal_year_to_yesterday": 200,
            }

            # Mock the service API client (shouldn't be called)
            mock_service_api_client = mocker.patch("app.main.views.dashboard.service_api_client")

            # Call function
            result = get_annual_data(mock_service_id, mock_dashboard_totals_daily)

            # Check was_seeded_today was called
            mock_annual_limit_client.was_seeded_today.assert_called_once_with(mock_service_id)

            # Check get_all_notification_counts was called
            mock_annual_limit_client.get_all_notification_counts.assert_called_once_with(mock_service_id)

            # Check service_api_client was not called
            mock_service_api_client.get_monthly_notification_stats.assert_not_called()

            # Verify result combines Redis data with daily totals
            assert result == {
                "sms": mock_dashboard_totals_daily["sms"]["requested"] + 100,  # 10 + 100 = 110
                "email": mock_dashboard_totals_daily["email"]["requested"] + 200,  # 20 + 200 = 220
            }

    def test_aggregate_by_type_daily(self, mock_dashboard_totals_daily, app_):
        """Test that aggregate_by_type_daily correctly aggregates data"""
        with app_.app_context():
            # Sample input data structure
            annual_data = {
                "data": {
                    "2023-04": {
                        "sms": {"requested": 30, "delivered": 28, "failed": 2},
                        "email": {"requested": 40, "delivered": 38, "failed": 2},
                    },
                    "2023-05": {
                        "sms": {"requested": 50, "delivered": 48, "failed": 2},
                        "email": {"requested": 60, "delivered": 58, "failed": 2},
                        "letter": {"requested": 10, "delivered": 10},
                    },
                }
            }

            # Call the function
            result = aggregate_by_type_daily(annual_data, mock_dashboard_totals_daily)

            # Get the actual values from the output for more readable assertion errors
            actual_sms = result["sms"]
            actual_email = result["email"]

            # In the function, all values in the dictionary are summed - not just 'requested'
            # So each SMS message type has requested + delivered + failed values summed
            expected_sms = 30 + 28 + 2 + 50 + 48 + 2 + 10  # From daily_data
            expected_email = 40 + 38 + 2 + 60 + 58 + 2 + 20  # From daily_data

            # Check individual values - note that these values are higher because all status types are summed
            assert actual_sms == expected_sms, f"Expected SMS count to be {expected_sms}, got {actual_sms}"
            assert actual_email == expected_email, f"Expected email count to be {expected_email}, got {actual_email}"

            # Finally check the whole dictionary
            assert result == {
                "sms": expected_sms,  # All SMS values summed + daily data
                "email": expected_email,  # All email values summed + daily data
            }


def test_new_badge_on_dashboard_when_no_templates(
    client_request: ClientRequest,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    app_,
):
    with set_config(app_, "FF_SAMPLE_TEMPLATES", True):
        page = client_request.get("main.service_dashboard", service_id=SERVICE_ONE_ID)
        assert len(page.select("[data-testid='dashboard-sample-library-badge']")) == 1


def test_new_badge_on_dashboard_when_some_templates(
    client_request: ClientRequest,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    app_,
):
    with set_config(app_, "FF_SAMPLE_TEMPLATES", True):
        page = client_request.get("main.service_dashboard", service_id=SERVICE_ONE_ID)
        assert len(page.select("[data-testid='dashboard-sample-library-badge']")) == 1
