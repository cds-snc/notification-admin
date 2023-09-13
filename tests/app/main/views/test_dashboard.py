import copy
import re

import pytest
from flask import url_for
from freezegun import freeze_time

from app.main.views.dashboard import (
    aggregate_notifications_stats,
    aggregate_status_types,
    aggregate_template_usage,
    format_monthly_stats_to_list,
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


@pytest.mark.parametrize(
    "permissions, text_in_page, text_not_in_page",
    [
        (["view_activity", "manage_templates"], ["Create template"], ["Choose template"]),
        (["view_activity", "send_messages"], ["Choose template"], ["Create template"]),
        (["view_activity"], [], ["Create template", "Choose template"]),
        (["view_activity", "manage_templates", "send_messages"], ["Create template", "Choose template"], []),
    ],
)
def test_task_shortcuts_are_visible_based_on_permissions(
    client_request: ClientRequest,
    active_user_with_permissions,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_template_statistics,
    permissions: list,
    text_in_page: list,
    text_not_in_page: list,
):
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


@freeze_time("2016-07-01 12:00")  # 4 months into 2016 financial year
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


@freeze_time("2016-07-01 12:00")  # 4 months into 2016 financial year
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
    client,
    api_user_active,
    service_one,
    mocker,
    mock_get_monthly_notification_stats,
):
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
    client_request,
    service_one,
    mock_get_monthly_notification_stats,
):
    page = client_request.get("main.monthly", service_id=service_one["id"])

    columns = page.select(".table-field-left-aligned .big-number-label")

    assert normalize_spaces(columns[0].text) == "emails"
    assert normalize_spaces(columns[1].text) == "text messages"


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
    mock_get_monthly_notification_stats,
    mock_get_monthly_template_usage,
):
    page = client_request.get(
        endpoint,
        service_id=SERVICE_ONE_ID,
    )

    assert normalize_spaces(page.select_one(".pill").text) == (
        "2012 to 2013 financial year " "2013 to 2014 financial year " "2014 to 2015 financial year"
    )


def test_monthly_has_equal_length_tables(
    client_request,
    service_one,
    mock_get_monthly_notification_stats,
):
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

    second_call = mock_get_jobs.call_args_list[1]
    assert second_call[0] == (SERVICE_ONE_ID,)
    assert second_call[1]["statuses"] == ["scheduled"]

    table_rows = page.find_all("tbody")[0].find_all("tr")
    assert len(table_rows) == 2

    assert "send_me_later.csv" in table_rows[0].find_all("th")[0].text
    assert "Starting 2016-01-01 11:09:00.061258" in table_rows[0].find_all("th")[0].text
    assert table_rows[0].find_all("td")[0].text.strip() == "Scheduled to send to 30 recipients"
    assert "even_later.csv" in table_rows[1].find_all("th")[0].text
    assert "Starting 2016-01-01 23:09:00.061258" in table_rows[1].find_all("th")[0].text
    assert table_rows[1].find_all("td")[0].text.strip() == "Scheduled to send to 30 recipients"


@pytest.mark.parametrize(
    "permissions, column_name, expected_column_count",
    [
        (["email", "sms"], ".w-1\\/2", 6),
        (["email", "sms"], ".w-1\\/2", 6),
    ],
)
def test_correct_columns_display_on_dashboard_v15(
    client_request: ClientRequest,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    permissions,
    expected_column_count,
    column_name,
    app_,
):
    service_one["permissions"] = permissions

    page = client_request.get("main.service_dashboard", service_id=service_one["id"])
    assert len(page.select(column_name)) == expected_column_count


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
            ("0 emails sent No failures", "0 text messages sent No failures", "0 problem email addresses No problem addresses"),
            "en",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 0, "delivered": 0, "failed": 0},
                "sms": {"requested": 0, "delivered": 0, "failed": 0},
            },
            (
                "0 courriel envoyé Aucun échec",
                "0 message texte envoyé Aucun échec",
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
            ("1 email sent No failures", "1 text message sent No failures", "0 problem email addresses No problem addresses"),
            "en",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 1, "delivered": 1, "failed": 0},
                "sms": {"requested": 1, "delivered": 1, "failed": 0},
            },
            (
                "1 courriel envoyé Aucun échec",
                "1 message texte envoyé Aucun échec",
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
            ("2 emails sent No failures", "2 text messages sent No failures", "0 problem email addresses No problem addresses"),
            "en",
        ),
        (
            ["email", "sms"],
            {
                "email": {"requested": 2, "delivered": 2, "failed": 0},
                "sms": {"requested": 2, "delivered": 2, "failed": 0},
            },
            (
                "2 courriels envoyés Aucun échec",
                "2 messages texte envoyés Aucun échec",
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

    third_call = mock_get_jobs.call_args_list[2]
    assert third_call[0] == (SERVICE_ONE_ID,)
    assert third_call[1]["limit_days"] == 7
    assert "scheduled" not in third_call[1]["statuses"]

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

    assert normalize_spaces(nav_links[0].text) == "2010 to 2011 financial year"
    assert normalize_spaces(nav.find("li", {"aria-selected": "true"}).text) == "2011 to 2012 financial year"
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

    assert normalize_spaces(nav_links[0].text) == "2010 to 2011 financial year"
    assert normalize_spaces(nav.find("li", {"aria-selected": "true"}).text) == "2011 to 2012 financial year"
    assert normalize_spaces(nav_links[1].text) == "2012 to 2013 financial year"
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
    with set_config(app_, "FF_BOUNCE_RATE_V15", True):
        service_one["permissions"] = (["email", "sms"],)

        mocker.patch("app.main.views.dashboard.get_dashboard_totals", return_value=totals)

        page = client_request.get("main.service_dashboard", service_id=service_one["id"])

        component_index = 0 if notification_type == "email" else 1

        assert page.find_all(class_="remaining-messages")[component_index].find(class_="rm-used").text == expected_sent
        assert page.find_all(class_="remaining-messages")[component_index].find(class_="rm-total").text[3:] == expected_limit
        assert (
            expected_color
            in page.find_all(class_="remaining-messages")[component_index].find(class_="rm-bar-usage").attrs["class"]
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
