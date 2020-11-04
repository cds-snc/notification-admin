import copy

import pytest
from bs4 import BeautifulSoup
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
from tests import (
    service_json,
    validate_route_permission,
    validate_route_permission_with_client,
)
from tests.conftest import (
    ORGANISATION_ID,
    SERVICE_ONE_ID,
    active_caseworking_user,
    active_user_view_permissions,
    normalize_spaces,
)

stub_template_stats = [
    {
        'template_type': 'sms',
        'template_name': 'one',
        'template_id': 'id-1',
        'status': 'created',
        'count': 50,
        'is_precompiled_letter': False
    },
    {
        'template_type': 'email',
        'template_name': 'two',
        'template_id': 'id-2',
        'status': 'created',
        'count': 100,
        'is_precompiled_letter': False
    },
    {
        'template_type': 'email',
        'template_name': 'two',
        'template_id': 'id-2',
        'status': 'technical-failure',
        'count': 100,
        'is_precompiled_letter': False
    },
    {
        'template_type': 'letter',
        'template_name': 'three',
        'template_id': 'id-3',
        'status': 'delivered',
        'count': 300,
        'is_precompiled_letter': False
    },
    {
        'template_type': 'sms',
        'template_name': 'one',
        'template_id': 'id-1',
        'status': 'delivered',
        'count': 50,
        'is_precompiled_letter': False
    },
    {
        'template_type': 'letter',
        'template_name': 'four',
        'template_id': 'id-4',
        'status': 'delivered',
        'count': 400,
        'is_precompiled_letter': True
    },
    {
        'template_type': 'letter',
        'template_name': 'four',
        'template_id': 'id-4',
        'status': 'cancelled',
        'count': 5,
        'is_precompiled_letter': True
    },
    {
        'template_type': 'letter',
        'template_name': 'thirty-three',
        'template_id': 'id-33',
        'status': 'cancelled',
        'count': 5,
        'is_precompiled_letter': False
    },
]


def create_stats(
    emails_requested=0,
    emails_delivered=0,
    emails_failed=0,
    sms_requested=0,
    sms_delivered=0,
    sms_failed=0,
    letters_requested=0,
    letters_delivered=0,
    letters_failed=0
):
    return {
        'sms': {
            'requested': sms_requested,
            'delivered': sms_delivered,
            'failed': sms_failed,
        },
        'email': {
            'requested': emails_requested,
            'delivered': emails_delivered,
            'failed': emails_failed,
        },
        'letter': {
            'requested': letters_requested,
            'delivered': letters_delivered,
            'failed': letters_failed,
        },
    }


@pytest.mark.parametrize('user', (
    active_user_view_permissions,
    active_caseworking_user,
))
def test_redirect_from_old_dashboard(
    logged_in_client,
    user,
    mocker,
    fake_uuid,
):
    mocker.patch('app.user_api_client.get_user', return_value=user(fake_uuid))
    expected_location = 'http://localhost/services/{}'.format(SERVICE_ONE_ID)

    response = logged_in_client.get('/services/{}/dashboard'.format(SERVICE_ONE_ID))

    assert response.status_code == 302
    assert response.location == expected_location
    assert expected_location == url_for('main.service_dashboard', service_id=SERVICE_ONE_ID, _external=True)


def test_redirect_caseworkers_to_templates(
    client_request,
    mocker,
    active_caseworking_user,
):
    mocker.patch('app.user_api_client.get_user', return_value=active_caseworking_user)
    client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
        _expected_status=302,
        _expected_redirect=url_for(
            'main.choose_template',
            service_id=SERVICE_ONE_ID,
            _external=True,
        )
    )


def test_get_started(
    client_request,
    mocker,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    mock_get_service_statistics,
    mock_get_usage,
):
    mocker.patch(
        'app.template_statistics_client.get_template_statistics_for_service',
        return_value=copy.deepcopy(stub_template_stats)
    )

    page = client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
    )

    mock_get_service_templates_when_no_templates_exist.assert_called_once_with(SERVICE_ONE_ID)
    assert 'Get started' in page.text


def test_get_started_is_hidden_once_templates_exist(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary
):
    mocker.patch(
        'app.template_statistics_client.get_template_statistics_for_service',
        return_value=copy.deepcopy(stub_template_stats)
    )
    page = client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
    )

    mock_get_service_templates.assert_called_once_with(SERVICE_ONE_ID)
    assert 'Get started' not in page.text


def test_should_show_recent_templates_on_dashboard(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_jobs,
    mock_get_service_statistics,
    mock_get_usage,
    mock_get_inbound_sms_summary
):
    mock_template_stats = mocker.patch('app.template_statistics_client.get_template_statistics_for_service',
                                       return_value=copy.deepcopy(stub_template_stats))

    page = client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
    )

    mock_template_stats.assert_called_once_with(SERVICE_ONE_ID, limit_days=7)

    headers = [header.text.strip() for header in page.find_all('h2') + page.find_all('h1')]
    assert 'In the last 7 days' in headers

    table_rows = page.find_all('tbody')[1].find_all('tr')

    assert len(table_rows) == 4

    assert 'Provided as PDF' in table_rows[0].find_all('th')[0].text
    assert 'Letter' in table_rows[0].find_all('th')[0].text
    assert '400' in table_rows[0].find_all('td')[0].text

    assert 'three' in table_rows[1].find_all('th')[0].text
    assert 'Letter template' in table_rows[1].find_all('th')[0].text
    assert '300' in table_rows[1].find_all('td')[0].text

    assert 'two' in table_rows[2].find_all('th')[0].text
    assert 'Email template' in table_rows[2].find_all('th')[0].text
    assert '200' in table_rows[2].find_all('td')[0].text

    assert 'one' in table_rows[3].find_all('th')[0].text
    assert 'Text message template' in table_rows[3].find_all('th')[0].text
    assert '100' in table_rows[3].find_all('td')[0].text


@freeze_time("2016-07-01 12:00")  # 4 months into 2016 financial year
@pytest.mark.parametrize('extra_args', [
    {},
    {'year': '2016'},
])
def test_should_show_redirect_from_template_history(
    client_request,
    extra_args,
):
    client_request.get(
        'main.template_history',
        service_id=SERVICE_ONE_ID,
        _expected_status=301,
        **extra_args,
    )


@freeze_time("2016-07-01 12:00")  # 4 months into 2016 financial year
@pytest.mark.parametrize('extra_args, template_label', [
    ({}, 'Text message template '),
    ({'year': '2016'}, 'Text message template '),
    ({'lang': 'fr'}, 'Gabarit message texte '),
])
def test_should_show_monthly_breakdown_of_template_usage(
    client_request,
    mock_get_monthly_template_usage,
    extra_args,
    template_label,
):
    page = client_request.get(
        'main.template_usage',
        service_id=SERVICE_ONE_ID,
        **extra_args
    )

    mock_get_monthly_template_usage.assert_called_once_with(SERVICE_ONE_ID, 2016)

    table_rows = page.select('tbody tr')

    assert ' '.join(table_rows[0].text.split()) == (
        'My first template ' + template_label + '2'
    )

    assert len(table_rows) == len(['April'])
    assert len(page.select('.table-no-data')) == len(['May', 'June', 'July'])


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
        'GET',
        200,
        url_for('main.monthly', service_id=service_one['id']),
        ['view_activity'],
        api_user_active,
        service_one,
    )


def test_monthly_shows_letters_in_breakdown(
    client_request,
    service_one,
    mock_get_monthly_notification_stats,
):
    page = client_request.get(
        'main.monthly',
        service_id=service_one['id']
    )

    columns = page.select('.table-field-left-aligned .big-number-label')

    assert normalize_spaces(columns[0].text) == 'emails'
    assert normalize_spaces(columns[1].text) == 'text messages'


def test_monthly_has_equal_length_tables(
    client_request,
    service_one,
    mock_get_monthly_notification_stats,
):
    page = client_request.get(
        'main.monthly',
        service_id=service_one['id']
    )

    assert page.select_one('.table-field-headings th').get('width') == "33%"


@freeze_time("2016-01-01 11:09:00.061258")
# This test assumes EST
def test_should_show_upcoming_jobs_on_dashboard(
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_usage,
    mock_get_inbound_sms_summary
):
    page = client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
    )

    second_call = mock_get_jobs.call_args_list[1]
    assert second_call[0] == (SERVICE_ONE_ID,)
    assert second_call[1]['statuses'] == ['scheduled']

    table_rows = page.find_all('tbody')[0].find_all('tr')
    assert len(table_rows) == 2

    assert 'send_me_later.csv' in table_rows[0].find_all('th')[0].text
    assert "Sending 2016-01-01 11:09:00.061258" in table_rows[0].find_all('th')[0].text
    assert table_rows[0].find_all('td')[0].text.strip() == '1'
    assert 'even_later.csv' in table_rows[1].find_all('th')[0].text
    assert "Sending 2016-01-01 23:09:00.061258" in table_rows[1].find_all('th')[0].text
    assert table_rows[1].find_all('td')[0].text.strip() == '1'


@pytest.mark.parametrize('permissions, column_name, expected_column_count', [
    (['email', 'sms'], '.column-half', 2),
    (['email', 'letter'], '.column-third', 3),
    (['email', 'sms'], '.column-half', 2)
])
def test_correct_columns_display_on_dashboard(
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    permissions,
    expected_column_count,
    column_name
):

    service_one['permissions'] = permissions

    page = client_request.get(
        'main.service_dashboard',
        service_id=service_one['id']
    )

    assert len(page.select(column_name)) == expected_column_count


@pytest.mark.parametrize('permissions, totals, big_number_class, expected_column_count', [
    (
        ['email', 'sms'],
        {
            'email': {'requested': 0, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 999999999, 'delivered': 0, 'failed': 0}
        },
        '.big-number',
        2,
    ),
    (
        ['email', 'sms'],
        {
            'email': {'requested': 1000000000, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 1000000, 'delivered': 0, 'failed': 0}
        },
        '.big-number-dark',
        2,
    ),
    (
        ['email', 'sms', 'letter'],
        {
            'email': {'requested': 0, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 99999, 'delivered': 0, 'failed': 0},
            'letter': {'requested': 99999, 'delivered': 0, 'failed': 0}
        },
        '.big-number',
        3,
    ),
    (
        ['email', 'sms', 'letter'],
        {
            'email': {'requested': 0, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 0, 'delivered': 0, 'failed': 0},
            'letter': {'requested': 100000, 'delivered': 0, 'failed': 0},
        },
        '.big-number-dark',
        3,
    ),
])
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
):

    service_one['permissions'] = permissions

    mocker.patch(
        'app.main.views.dashboard.get_dashboard_totals',
        return_value=totals
    )

    page = client_request.get(
        'main.service_dashboard',
        service_id=service_one['id'],
    )

    assert expected_column_count == len(
        page.select('.big-number-with-status {}'.format(big_number_class))
    )


@pytest.mark.parametrize('permissions, totals, expected_big_numbers_single_plural, lang', [
    (
        ['email', 'sms'],
        {
            'email': {'requested': 0, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 0, 'delivered': 0, 'failed': 0}
        },
        (
            '0 emails sent No failures',
            '0 text messages sent No failures'
        ),
        "en"
    ),
    (
        ['email', 'sms'],
        {
            'email': {'requested': 0, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 0, 'delivered': 0, 'failed': 0}
        },
        (
            '0 courriel envoyé Aucun échec',
            '0 message texte envoyé Aucun échec'
        ),
        "fr"
    ),
    (
        ['email', 'sms'],
        {
            'email': {'requested': 1, 'delivered': 1, 'failed': 0},
            'sms': {'requested': 1, 'delivered': 1, 'failed': 0}
        },
        (
            '1 email sent No failures',
            '1 text message sent No failures'
        ),
        "en"
    ),
    (
        ['email', 'sms'],
        {
            'email': {'requested': 1, 'delivered': 1, 'failed': 0},
            'sms': {'requested': 1, 'delivered': 1, 'failed': 0}
        },
        (
            '1 courriel envoyé Aucun échec',
            '1 message texte envoyé Aucun échec'
        ),
        "fr"
    ),
    (
        ['email', 'sms'],
        {
            'email': {'requested': 2, 'delivered': 2, 'failed': 0},
            'sms': {'requested': 2, 'delivered': 2, 'failed': 0}
        },
        (
            '2 emails sent No failures',
            '2 text messages sent No failures'
        ),
        "en"
    ),
    (
        ['email', 'sms'],
        {
            'email': {'requested': 2, 'delivered': 2, 'failed': 0},
            'sms': {'requested': 2, 'delivered': 2, 'failed': 0}
        },
        (
            '2 courriels envoyés Aucun échec',
            '2 messages texte envoyé Aucun échec'
        ),
        "fr"
    ),
])
def test_dashboard_single_and_plural(
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
    lang
):

    service_one['permissions'] = permissions

    mocker.patch(
        'app.main.views.dashboard.get_dashboard_totals',
        return_value=totals
    )

    page = client_request.get(
        'main.service_dashboard',
        service_id=service_one['id'],
        lang=lang
    )

    assert (
        normalize_spaces(page.select('.big-number-with-status')[0].text),
        normalize_spaces(page.select('.big-number-with-status')[1].text),
    ) == expected_big_numbers_single_plural

##


@freeze_time("2016-01-01 11:09:00.061258")
# This test assumes EST
def test_should_show_recent_jobs_on_dashboard(
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_usage,
    mock_get_inbound_sms_summary
):
    page = client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
    )

    third_call = mock_get_jobs.call_args_list[2]
    assert third_call[0] == (SERVICE_ONE_ID,)
    assert third_call[1]['limit_days'] == 7
    assert 'scheduled' not in third_call[1]['statuses']

    table_rows = page.find_all('tbody')[2].find_all('tr')

    assert len(table_rows) == 4

    for index, filename in enumerate((
            "export 1/1/2016.xls",
            "all email addresses.xlsx",
            "applicants.ods",
            "thisisatest.csv",
    )):
        assert filename in table_rows[index].find_all('th')[0].text
        assert '2016-01-01T11:09:00.061258+0000' in table_rows[index].find_all('th')[0].text
        for column_index, count in enumerate((1, 0, 0)):
            assert table_rows[index].find_all('td')[column_index].text.strip() == str(count)


@freeze_time("2012-03-31 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_usage_page(
    client_request,
    mock_get_usage,
    mock_get_billable_units,
    mock_get_free_sms_fragment_limit
):
    page = client_request.get(
        'main.usage',
        service_id=SERVICE_ONE_ID,
    )

    mock_get_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_usage.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2011)

    cols = page.find_all('div', {'class': 'column-half'})
    nav = page.find('ul', {'class': 'pill', 'role': 'tablist'})
    nav_links = nav.find_all('a')

    assert normalize_spaces(nav_links[0].text) == '2010 to 2011 financial year'
    assert normalize_spaces(nav.find('li', {'aria-selected': 'true'}).text) == '2011 to 2012 financial year'
    assert '252,190' in cols[1].text
    assert 'Text messages' in cols[1].text

    table = page.find('table').text.strip()

    assert '249,860 free text messages' in table
    assert '40 free text messages' in table
    assert '960 text messages at 1.65p' in table
    assert 'April' in table
    assert 'February' in table
    assert 'March' in table
    assert '£15.84' in table
    assert '140 free text messages' in table
    assert '£20.30' in table
    assert '1,230 text messages at 1.65p' in table


@freeze_time("2012-03-31 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_usage_page_with_letters(
    client_request,
    service_one,
    mock_get_usage,
    mock_get_billable_units,
    mock_get_free_sms_fragment_limit
):
    service_one['permissions'].append('letter')
    page = client_request.get(
        'main.usage',
        service_id=SERVICE_ONE_ID,
    )

    mock_get_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_usage.assert_called_once_with(SERVICE_ONE_ID, 2011)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2011)

    cols = page.find_all('div', {'class': 'column-one-third'})
    nav = page.find('ul', {'class': 'pill', 'role': 'tablist'})
    nav_links = nav.find_all('a')

    assert normalize_spaces(nav_links[0].text) == '2010 to 2011 financial year'
    assert normalize_spaces(nav.find('li', {'aria-selected': 'true'}).text) == '2011 to 2012 financial year'
    assert normalize_spaces(nav_links[1].text) == '2012 to 2013 financial year'
    assert '252,190' in cols[1].text
    assert 'Text messages' in cols[1].text

    table = page.find('table').text.strip()

    assert '249,860 free text messages' in table
    assert '40 free text messages' in table
    assert '960 text messages at 1.65p' in table
    assert 'April' in table
    assert 'February' in table
    assert 'March' in table
    assert '£20.59' in table
    assert '140 free text messages' in table
    assert '£20.30' in table
    assert '1,230 text messages at 1.65p' in table
    assert '10 second class letters at 31p' in normalize_spaces(table)
    assert '5 first class letters at 33p' in normalize_spaces(table)


@freeze_time("2012-04-30 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_usage_page_displays_letters_ordered_by_postage(
    mocker,
    client_request,
    service_one,
    mock_get_usage,
    mock_get_free_sms_fragment_limit
):
    billable_units_resp = [
        {'month': 'April', 'notification_type': 'letter', 'rate': 0.5, 'billing_units': 1, 'postage': 'second'},
        {'month': 'April', 'notification_type': 'letter', 'rate': 0.3, 'billing_units': 3, 'postage': 'second'},
        {'month': 'April', 'notification_type': 'letter', 'rate': 0.5, 'billing_units': 1, 'postage': 'first'},
    ]
    mocker.patch('app.billing_api_client.get_billable_units', return_value=billable_units_resp)
    service_one['permissions'].append('letter')
    page = client_request.get(
        'main.usage',
        service_id=SERVICE_ONE_ID,
    )

    row_for_april = page.find('table').find('tr', class_='table-row')
    postage_details = row_for_april.find_all('li', class_='tabular-numbers')

    assert len(postage_details) == 3
    assert normalize_spaces(postage_details[0].text) == '1 first class letter at 50p'
    assert normalize_spaces(postage_details[1].text) == '3 second class letters at 30p'
    assert normalize_spaces(postage_details[2].text) == '1 second class letter at 50p'


@pytest.mark.skip(reason="feature not in use")
def test_usage_page_with_year_argument(
    logged_in_client,
    mock_get_usage,
    mock_get_billable_units,
    mock_get_free_sms_fragment_limit,
):
    assert logged_in_client.get(url_for('main.usage', service_id=SERVICE_ONE_ID, year=2000)).status_code == 200
    mock_get_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2000)
    mock_get_usage.assert_called_once_with(SERVICE_ONE_ID, 2000)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2000)


@pytest.mark.skip(reason="feature not in use")
def test_usage_page_for_invalid_year(
    client_request,
):
    client_request.get(
        'main.usage',
        service_id=SERVICE_ONE_ID,
        year='abcd',
        _expected_status=404,
    )


@freeze_time("2012-03-31 12:12:12")
@pytest.mark.skip(reason="feature not in use")
def test_future_usage_page(
    client_request,
    mock_get_future_usage,
    mock_get_future_billable_units,
    mock_get_free_sms_fragment_limit
):
    client_request.get(
        'main.usage',
        service_id=SERVICE_ONE_ID,
        year=2014,
    )

    mock_get_future_billable_units.assert_called_once_with(SERVICE_ONE_ID, 2014)
    mock_get_future_usage.assert_called_once_with(SERVICE_ONE_ID, 2014)
    mock_get_free_sms_fragment_limit.assert_called_with(SERVICE_ONE_ID, 2014)


def _test_dashboard_menu(mocker, app_, usr, service, permissions):
    with app_.test_request_context():
        with app_.test_client() as client:
            usr['permissions'][str(service['id'])] = permissions
            usr['services'] = [service['id']]
            mocker.patch('app.user_api_client.check_verify_code', return_value=(True, ''))
            mocker.patch('app.service_api_client.get_services', return_value={'data': [service]})
            mocker.patch('app.user_api_client.get_user', return_value=usr)
            mocker.patch('app.user_api_client.get_user_by_email', return_value=usr)
            mocker.patch('app.service_api_client.get_service', return_value={'data': service})
            client.login(usr)
            return client.get(url_for('main.service_dashboard', service_id=service['id']))


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
    service_one['permissions'] = ['email', 'sms', 'letter', 'upload_letters']

    with app_.test_request_context():
        resp = _test_dashboard_menu(
            mocker,
            app_,
            api_user_active,
            service_one,
            ['view_activity', 'send_messages'])
        page = resp.get_data(as_text=True)
        assert url_for(
            'main.choose_template',
            service_id=service_one['id'],
        ) in page
        assert url_for('main.uploads', service_id=service_one['id']) in page
        assert url_for('main.manage_users', service_id=service_one['id']) in page

        assert url_for('main.service_settings', service_id=service_one['id']) not in page
        assert url_for('main.api_keys', service_id=service_one['id']) not in page
        assert url_for('main.view_providers') not in page


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
            ['view_activity', 'send_messages'])
        page = resp.get_data(as_text=True)
        assert url_for('main.uploads', service_id=service_one['id']) not in page


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
            ['view_activity', 'manage_templates', 'manage_service'])
        page = resp.get_data(as_text=True)
        assert url_for(
            'main.choose_template',
            service_id=service_one['id'],
        ) in page
        assert url_for('main.manage_users', service_id=service_one['id']) in page
        assert url_for('main.service_settings', service_id=service_one['id']) in page

        assert url_for('main.api_keys', service_id=service_one['id']) not in page


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
            ['view_activity', 'manage_api_keys'])

        page = resp.get_data(as_text=True)

        assert url_for('main.choose_template', service_id=service_one['id'],) in page
        assert url_for('main.manage_users', service_id=service_one['id']) in page
        assert url_for('main.service_settings', service_id=service_one['id']) in page
        assert url_for('main.api_integration', service_id=service_one['id']) in page


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
        resp = _test_dashboard_menu(
            mocker,
            app_,
            platform_admin_user,
            service_one,
            [])
        page = resp.get_data(as_text=True)
        assert url_for('main.choose_template', service_id=service_one['id']) in page
        assert url_for('main.manage_users', service_id=service_one['id']) in page
        assert url_for('main.service_settings', service_id=service_one['id']) in page
        assert url_for('main.view_notifications', service_id=service_one['id'], message_type='email') in page
        assert url_for('main.view_notifications', service_id=service_one['id'], message_type='sms') in page
        assert url_for('main.api_keys', service_id=service_one['id']) not in page


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
    mock_get_inbound_sms_summary
):
    with app_.test_request_context():
        validate_route_permission(
            mocker,
            app_,
            "GET",
            200,
            url_for('main.service_dashboard', service_id=service_one['id']),
            ['view_activity'],
            api_user_active,
            service_one)


def test_aggregate_template_stats():
    expected = aggregate_template_usage(copy.deepcopy(stub_template_stats))
    assert len(expected) == 4
    assert expected[0]['template_name'] == 'four'
    assert expected[0]['count'] == 400
    assert expected[0]['template_id'] == 'id-4'
    assert expected[0]['template_type'] == 'letter'
    assert expected[1]['template_name'] == 'three'
    assert expected[1]['count'] == 300
    assert expected[1]['template_id'] == 'id-3'
    assert expected[1]['template_type'] == 'letter'
    assert expected[2]['template_name'] == 'two'
    assert expected[2]['count'] == 200
    assert expected[2]['template_id'] == 'id-2'
    assert expected[2]['template_type'] == 'email'
    assert expected[3]['template_name'] == 'one'
    assert expected[3]['count'] == 100
    assert expected[3]['template_id'] == 'id-1'
    assert expected[3]['template_type'] == 'sms'


def test_aggregate_notifications_stats():
    expected = aggregate_notifications_stats(copy.deepcopy(stub_template_stats))
    assert expected == {
        "sms": {"requested": 100, "delivered": 50, "failed": 0},
        "letter": {"requested": 700, "delivered": 700, "failed": 0},
        "email": {"requested": 200, "delivered": 0, "failed": 100}
    }


def test_service_dashboard_updates_gets_dashboard_totals(
    mocker,
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_usage,
    mock_get_inbound_sms_summary
):
    mocker.patch('app.main.views.dashboard.get_dashboard_totals', return_value={
        'email': {'requested': 123, 'delivered': 0, 'failed': 0},
        'sms': {'requested': 456, 'delivered': 0, 'failed': 0}
    })

    page = client_request.get(
        'main.service_dashboard',
        service_id=SERVICE_ONE_ID,
    )

    numbers = [number.text.strip() for number in page.find_all('div', class_='big-number-number')]
    assert '123' in numbers
    assert '456' in numbers


def test_get_dashboard_totals_adds_percentages():
    stats = {
        'sms': {
            'requested': 3,
            'delivered': 0,
            'failed': 2
        },
        'email': {
            'requested': 0,
            'delivered': 0,
            'failed': 0
        }
    }
    assert get_dashboard_totals(stats)['sms']['failed_percentage'] == '66.7'
    assert get_dashboard_totals(stats)['email']['failed_percentage'] == '0'


@pytest.mark.parametrize(
    'failures,expected', [
        (2, False),
        (3, False),
        (4, True)
    ]
)
def test_get_dashboard_totals_adds_warning(failures, expected):
    stats = {
        'sms': {
            'requested': 100,
            'delivered': 0,
            'failed': failures
        }
    }
    assert get_dashboard_totals(stats)['sms']['show_warning'] == expected


def test_format_monthly_stats_empty_case():
    assert format_monthly_stats_to_list({}) == []


def test_format_monthly_stats_has_stats_with_failure_rate():
    resp = format_monthly_stats_to_list({
        '2016-07': {'sms': _stats(3, 1, 2)}
    })
    assert resp[0]['sms_counts'] == {
        'failed': 2,
        'failed_percentage': '66.7',
        'requested': 3,
        'show_warning': True,
    }


def test_format_monthly_stats_works_for_email_letter():
    resp = format_monthly_stats_to_list({
        '2016-07': {
            'sms': {},
            'email': {},
            'letter': {},
        }
    })
    assert isinstance(resp[0]['sms_counts'], dict)
    assert isinstance(resp[0]['email_counts'], dict)
    assert isinstance(resp[0]['letter_counts'], dict)


def _stats(requested, delivered, failed):
    return {'requested': requested, 'delivered': delivered, 'failed': failed}


@pytest.mark.parametrize('dict_in, expected_failed, expected_requested', [
    (
        {},
        0,
        0
    ),
    (
        {'temporary-failure': 1, 'permanent-failure': 1, 'technical-failure': 1},
        3,
        3,
    ),
    (
        {'created': 1, 'pending': 1, 'sending': 1, 'delivered': 1},
        0,
        4,
    ),
])
def test_aggregate_status_types(dict_in, expected_failed, expected_requested):
    sms_counts = aggregate_status_types({'sms': dict_in})['sms_counts']
    assert sms_counts['failed'] == expected_failed
    assert sms_counts['requested'] == expected_requested


@pytest.mark.parametrize(
    'now, expected_number_of_months', [
        (freeze_time("2017-12-31 11:09:00.061258"), 12),
        (freeze_time("2017-01-01 11:09:00.061258"), 10)
    ]
)
def test_get_free_paid_breakdown_for_billable_units(now, expected_number_of_months):
    sms_allowance = 250000
    with now:
        billing_units = get_free_paid_breakdown_for_billable_units(
            2016, sms_allowance, [
                {
                    'month': 'April', 'international': False, 'rate_multiplier': 1,
                    'notification_type': 'sms', 'rate': 1.65, 'billing_units': 100000
                },
                {
                    'month': 'May', 'international': False, 'rate_multiplier': 1,
                    'notification_type': 'sms', 'rate': 1.65, 'billing_units': 100000
                },
                {
                    'month': 'June', 'international': False, 'rate_multiplier': 1,
                    'notification_type': 'sms', 'rate': 1.65, 'billing_units': 100000
                },
                {
                    'month': 'February', 'international': False, 'rate_multiplier': 1,
                    'notification_type': 'sms', 'rate': 1.65, 'billing_units': 2000
                },
            ]
        )
        assert list(billing_units) == [
            {'free': 100000, 'name': 'April', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 100000, 'name': 'May', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 50000, 'name': 'June', 'paid': 50000, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'July', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'August', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'September', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'October', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'November', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'December', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'January', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'February', 'paid': 2000, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0},
            {'free': 0, 'name': 'March', 'paid': 0, 'letter_total': 0, 'letters': [], 'letter_cumulative': 0}
        ][:expected_number_of_months]


def test_org_breadcrumbs_do_not_show_if_service_has_no_org(
    client_request,
    mock_get_template_statistics,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
):
    page = client_request.get('main.service_dashboard', service_id=SERVICE_ONE_ID)

    assert not page.select('.navigation-organisation-link')


def test_org_breadcrumbs_do_not_show_if_user_is_not_an_org_member(
    mocker,
    client,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    active_caseworking_user,
    client_request,
    mock_get_template_folders,
):
    # active_caseworking_user is not an org member

    service_one_json = service_json(SERVICE_ONE_ID,
                                    users=[active_caseworking_user['id']],
                                    restricted=False,
                                    organisation_id=ORGANISATION_ID)
    mocker.patch('app.service_api_client.get_service', return_value={'data': service_one_json})

    client_request.login(active_caseworking_user, service=service_one_json)
    page = client_request.get('main.service_dashboard', service_id=SERVICE_ONE_ID, _follow_redirects=True)

    assert not page.select('.navigation-organisation-link')


def test_org_breadcrumbs_show_if_user_is_a_member_of_the_services_org(
    mocker,
    mock_get_template_statistics,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    active_user_with_permissions,
    client_request,
):
    # active_user_with_permissions (used by the client_request) is an org member

    service_one_json = service_json(SERVICE_ONE_ID,
                                    users=[active_user_with_permissions['id']],
                                    restricted=False,
                                    organisation_id=ORGANISATION_ID)

    mocker.patch('app.service_api_client.get_service', return_value={'data': service_one_json})
    mocker.patch('app.models.service.Organisation')

    page = client_request.get('main.service_dashboard', service_id=SERVICE_ONE_ID)
    assert page.select_one('.navigation-organisation-link')['href'] == url_for(
        'main.organisation_dashboard',
        org_id=ORGANISATION_ID,
    )


def test_org_breadcrumbs_do_not_show_if_user_is_a_member_of_the_services_org_but_service_is_in_trial_mode(
    mocker,
    mock_get_template_statistics,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    active_user_with_permissions,
    client_request,
):
    # active_user_with_permissions (used by the client_request) is an org member

    service_one_json = service_json(SERVICE_ONE_ID,
                                    users=[active_user_with_permissions['id']],
                                    organisation_id=ORGANISATION_ID)

    mocker.patch('app.service_api_client.get_service', return_value={'data': service_one_json})
    mocker.patch('app.models.service.Organisation')

    page = client_request.get('main.service_dashboard', service_id=SERVICE_ONE_ID)

    assert not page.select('.navigation-breadcrumb')


def test_org_breadcrumbs_show_if_user_is_platform_admin(
    mocker,
    mock_get_template_statistics,
    mock_get_service_templates_when_no_templates_exist,
    mock_get_jobs,
    platform_admin_user,
    platform_admin_client,
):
    service_one_json = service_json(SERVICE_ONE_ID,
                                    users=[platform_admin_user['id']],
                                    organisation_id=ORGANISATION_ID)

    mocker.patch('app.service_api_client.get_service', return_value={'data': service_one_json})
    mocker.patch('app.models.service.Organisation')

    response = platform_admin_client.get(url_for('main.service_dashboard', service_id=SERVICE_ONE_ID))
    page = BeautifulSoup(response.data.decode('utf-8'), 'html.parser')

    assert page.select_one('.navigation-organisation-link')['href'] == url_for(
        'main.organisation_dashboard',
        org_id=ORGANISATION_ID,
    )
