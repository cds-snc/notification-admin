import pytest
from bs4 import BeautifulSoup
from flask import url_for

from app.main.forms import FieldWithLanguageOptions
from tests.conftest import a11y_test, normalize_spaces, sample_uuid

service = [{'service_id': 1, 'service_name': 'jessie the oak tree',
            'organisation_name': 'Forest', 'consent_to_research': True,
            'contact_name': 'Forest fairy', 'organisation_type': 'Ecosystem',
            'contact_email': 'forest.fairy@digital.cabinet-office.canada.ca',
            'contact_mobile': '+16132532223', 'live_date': 'Sat, 29 Mar 2014 00:00:00 GMT',
            'sms_volume_intent': 100, 'email_volume_intent': 50, 'letter_volume_intent': 20,
            'sms_totals': 300, 'email_totals': 1200, 'letter_totals': 0,
            'free_sms_fragment_limit': 100}]


def test_non_logged_in_user_can_see_homepage(
    mocker,
    client,
    mock_get_service_and_organisation_counts,
):
    mocker.patch('app.service_api_client.get_live_services_data', return_value={'data': service})
    response = client.get(url_for('main.index'))
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode('utf-8'), 'html.parser')

    assert page.h1.text.strip() == (
        'Notify'
    )

    assert page.select_one('meta[name=description]')['content'].strip() == (
        'GC Notify lets you send emails and text messages to your users'
    )


@pytest.mark.skip(reason="@todo the chromedriver needs to be updated")
def test_documentation_a11y(
    client,
    mock_get_service_and_organisation_counts,
):
    response = client.get(url_for('main.documentation'))
    assert response.status_code == 200
    assert a11y_test(response.data.decode('utf-8'))


def test_logged_in_user_redirects_to_choose_account(
    mocker,
    client_request,
    api_user_active,
    mock_get_user,
    mock_get_user_by_email,
    mock_login,
):
    mocker.patch('app.service_api_client.get_live_services_data', return_value={'data': service})
    client_request.get(
        'main.index',
        _expected_status=302,
    )
    client_request.get(
        'main.sign_in',
        _expected_status=302,
        _expected_redirect=url_for('main.show_accounts_or_dashboard', _external=True)
    )


def test_robots(client):
    assert url_for('main.robots') == '/robots.txt'
    response = client.get(url_for('main.robots'))
    assert response.headers['Content-Type'] == 'text/plain'
    assert response.status_code == 200
    assert response.get_data(as_text=True) == (
        'User-agent: *\n'
        'Disallow: /sign-in\n'
        'Disallow: /contact\n'
        'Disallow: /register\n'
    )


@pytest.mark.parametrize('view', [
    'privacy', 'pricing', 'terms', 'roadmap',
    'features', 'callbacks', 'documentation', 'security',
    'messages_status', 'email', 'sms',
    'letters',
])
def test_static_pages(
    client_request,
    mock_get_organisation_by_domain,
    view,
):
    page = client_request.get('main.{}'.format(view))
    assert not page.select_one('meta[name=description]')


@pytest.mark.parametrize('view, expected_view', [
    ('redirect_roadmap', 'roadmap'),
    ('redirect_email', 'email'),
    ('redirect_sms', 'sms'),
    ('redirect_letters', 'letters'),
    ('redirect_templates', 'templates'),
    ('redirect_security', 'security'),
    ('redirect_terms', 'terms'),
    ('redirect_messages_status', 'messages_status'),
    ('redirect_contact', 'contact'),
])
def test_old_static_pages_redirect(
    client,
    view,
    expected_view
):
    response = client.get(url_for('main.{}'.format(view)))
    assert response.status_code == 301
    assert response.location == url_for(
        'main.{}'.format(expected_view),
        _external=True
    )


def test_terms_page_has_correct_content(client_request):
    terms_page = client_request.get('main.terms')
    assert normalize_spaces(terms_page.select('main p')[0].text) == (
        'The following terms apply to use of GC Notify, a product operated by the '
        'Canadian Digital Service (CDS). GC Notify is available for use by Canadian federal '
        'and provincial departments and agencies to send service transaction updates.'
    )


def test_css_is_served_from_correct_path(client_request):

    page = client_request.get('main.documentation')  # easy static page

    for index, link in enumerate(
        page.select('link[rel=stylesheet]')
    ):

        assert link['href'].startswith([
            'https://static.example.com/stylesheets/header.css?',
            'https://static.example.com/stylesheets/notification-template.css?',
            'https://fonts.googleapis.com/css?family=Lato:400,700,900&display=swap',
            'https://fonts.googleapis.com/css?',
            'https://static.example.com/stylesheets/main.css?',
        ][index])


@pytest.mark.parametrize('extra_args, email_branding_retrieved', (
    (
        {},
        False,
    ),
    (
        {'branding_style': '__FIP-EN__'},
        False,
    ),
    (
        {'branding_style': '__FIP-FR__'},
        False,
    ),
    (
        {'branding_style': sample_uuid()},
        True,
    ),
))
def test_email_branding_preview(
    client_request,
    mock_get_email_branding,
    extra_args,
    email_branding_retrieved,
):
    client_request.get(
        'main.email_template',
        _test_page_title=False,
        **extra_args
    )
    assert mock_get_email_branding.called is email_branding_retrieved


@pytest.mark.skip(reason="feature not in use")
@pytest.mark.parametrize('branding_style, filename', [
    ('hm-government', 'hm-government'),
    (None, 'no-branding'),
    (FieldWithLanguageOptions.ENGLISH_OPTION_VALUE, 'no-branding')
])
def test_letter_template_preview_links_to_the_correct_image(
    client_request,
    mocker,
    mock_get_letter_branding_by_id,
    branding_style,
    filename,
):
    page = client_request.get(
        'main.letter_template',
        _test_page_title=False,
        branding_style=branding_style
    )

    image_link = page.find('img')['src']

    assert image_link == url_for(
        'main.letter_branding_preview_image',
        filename=filename,
        page=1
    )


def test_letter_template_preview_headers(
    client,
    mock_get_letter_branding_by_id,
):
    response = client.get(
        url_for('main.letter_template', branding_style='hm-government')
    )

    assert response.headers.get('X-Frame-Options') == 'SAMEORIGIN'


@pytest.mark.parametrize('query_key, query_value, heading', [
    ('lang', 'en', 'Notify'),  # 'Notify' = english heading
    ('lang', 'fr', 'Notification'),  # 'Notification' = french heading
    ('lang', 'sa?SDFa?DFa,/', 'Notify'),
    ('xyz', 'xyz', 'Notify'),
    ('sa?SDFa?DFa,/', 'sa?SDFa?DFa,/', 'Notify')
])
def test_query_params(
    mocker,
    client,
    mock_get_service_and_organisation_counts,
    query_key,
    query_value,
    heading
):
    mocker.patch('app.service_api_client.get_live_services_data', return_value={'data': service})

    response = client.get(url_for('main.index', **{query_key: query_value}))

    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode('utf-8'), 'html.parser')

    assert page.h1.text.strip() == (
        heading
    )
