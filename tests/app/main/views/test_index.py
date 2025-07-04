import pytest
from bs4 import BeautifulSoup
from flask import current_app, url_for

from app.articles.routing import gca_url_for
from app.main.forms import FieldWithLanguageOptions
from app.utils import documentation_url
from tests.conftest import a11y_test, normalize_spaces, sample_uuid

services = [
    {
        "service_id": 1,
        "service_name": "jessie the oak tree",
        "organisation_name": "Forest",
        "consent_to_research": True,
        "contact_name": "Forest fairy",
        "organisation_type": "Ecosystem",
        "contact_email": "forest.fairy@digital.cabinet-office.canada.ca",
        "contact_mobile": "+16132532223",
        "live_date": "Sat, 29 Mar 2014 00:00:00 GMT",
        "sms_volume_intent": 100,
        "email_volume_intent": 50,
        "letter_volume_intent": 20,
        "sms_totals": 300,
        "email_totals": 1200,
        "letter_totals": 0,
        "free_sms_fragment_limit": 100,
    },
    {
        "service_id": 2,
        "service_name": "jessie the birch tree",
        "organisation_name": "Forest",
        "consent_to_research": True,
        "contact_name": "Forest fairy",
        "organisation_type": "Ecosystem",
        "contact_email": "forest.fairy@digital.cabinet-office.canada.ca",
        "contact_mobile": "+16132532223",
        "live_date": "Sat, 29 Mar 2014 00:00:00 GMT",
        "sms_volume_intent": 100,
        "email_volume_intent": 50,
        "letter_volume_intent": 20,
        "sms_totals": 300,
        "email_totals": 1200,
        "letter_totals": 0,
        "free_sms_fragment_limit": 100,
    },
]


def test_non_logged_in_user_can_see_homepage(mocker, client, mock_calls_out_to_GCA):
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )

    response = client.get(url_for("main.index"))
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    assert page.select_one("#gc-title").text.strip() == ("GC Notify")

    assert page.select_one("meta[name=description]")["content"].strip() == (
        "GC Notify lets you send emails and text messages to your users"
    )


@pytest.mark.skip(reason="TODO: a11y test")
def test_home_page_a11y(mocker, client, mock_calls_out_to_GCA):
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )

    response = client.get(url_for("main.index"))
    assert response.status_code == 200
    a11y_test(url_for("main.index", _external=True), response.data.decode("utf-8"))


def test_logged_in_user_redirects_to_choose_account(
    client_request,
    api_user_active,
    mock_get_user,
    mock_get_user_by_email,
    mock_login,
):
    client_request.get(
        "main.index",
        _expected_status=302,
    )
    client_request.get(
        "main.sign_in",
        _expected_status=302,
        _expected_redirect=url_for("main.show_accounts_or_dashboard"),
    )


def test_robots(client):
    assert url_for("main.robots") == "/robots.txt"
    response = client.get(url_for("main.robots"))
    assert response.headers["Content-Type"] == "text/plain"
    assert response.status_code == 200
    robot_rules = [
        "User-agent: *",
        "Disallow: /sign-in",
        "Disallow: /contact",
        "Disallow: /register",
    ]
    assert response.get_data(as_text=True) == ("\n".join(robot_rules))


def test_security_txt(client):
    assert url_for("main.security_txt") == "/.well-known/security.txt"
    response = client.get(url_for("main.security_txt"))
    assert response.headers["Content-Type"] == "text/plain"
    assert response.status_code == 200
    security_policy = gca_url_for("security", _external=True)

    security_info = [
        f'Contact: mailto:{current_app.config["SECURITY_EMAIL"]}',
        "Preferred-Languages: en, fr",
        f"Policy: {security_policy}",
        "Hiring: https://digital.canada.ca/join-our-team/",
        "Hiring: https://numerique.canada.ca/rejoindre-notre-equipe/",
    ]
    assert response.get_data(as_text=True) == ("\n".join(security_info))


@pytest.mark.parametrize(
    "view",
    [
        "pricing",
        "roadmap",
        "email",
        "sms",
        "letters",
        "welcome",
    ],
)
def test_static_pages(
    client_request,
    mock_get_organisation_by_domain,
    view,
):
    page = client_request.get("main.{}".format(view))
    assert not page.select_one("meta[name=description]")


@pytest.mark.parametrize(
    "stats, services",
    [
        (
            [  # Heartbeat's filtered
                ("2020-11-01", "email", 20),
                ("2020-11-01", "sms", 20),
            ],
            [
                services[0],
            ],
        ),
        (
            [  # Heartbeat's not filtered
                ("2020-11-01", "email", 170),
                ("2020-11-01", "sms", 150),
            ],
            services,
        ),
    ],
)
def test_activity_page(mocker, client, stats, services):
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": stats},
    )
    response = client.get(url_for("main.activity"))
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert response.status_code == 200
    assert page.select("div[data-test-id='totals']")[0].text == str(sum(x[2] for x in stats))
    assert page.select("div[data-test-id='services']")[0].text == str(len(services))


@pytest.mark.parametrize(
    "view, expected_view",
    [
        ("redirect_roadmap", "roadmap"),
        ("redirect_email", "email"),
        ("redirect_sms", "sms"),
        ("redirect_letters", "letters"),
        ("redirect_contact", "contact"),
    ],
)
def test_old_static_pages_redirect(client, view, expected_view):
    response = client.get(url_for("main.{}".format(view)))
    assert response.status_code == 301
    assert response.location == url_for("main.{}".format(expected_view))


def test_old_callbacks_page_redirects(client):
    response = client.get(url_for("main.callbacks"))
    assert response.status_code == 301
    assert response.location == documentation_url("callbacks")


def test_old_documentation_page_redirects(client):
    response = client.get(url_for("main.documentation"))
    assert response.status_code == 301
    assert response.location == documentation_url()


@pytest.mark.skip(reason="This calls out to GCA and is now an integration test")
@pytest.mark.integration
def test_terms_page_has_correct_content(client_request):
    terms_page = client_request.get_url("/terms")
    assert normalize_spaces(terms_page.select("main p")[0].text) == (
        "The following terms apply to use of GC Notify, a product operated by the "
        "Canadian Digital Service (CDS). GC Notify is available for use by Canadian federal "
        "departments and agencies to send service transaction updates."
    )


@pytest.mark.parametrize(
    "css_file_start",
    [
        "http://localhost:6012/static/stylesheets/index.css",
        "https://fonts.googleapis.com/css?family=Lato:400,700,900&display=swap",
        "https://fonts.googleapis.com/css?",
    ],
)
def test_css_is_served_from_correct_path(client_request, css_file_start):
    page = client_request.get("main.welcome")  # easy static page

    # ensure <link> element's `href` value begins with `css_file_start`
    assert page.select_one(f'link[href^="{css_file_start}"]') is not None


@pytest.mark.parametrize(
    "extra_args, email_branding_retrieved",
    (
        (
            {},
            False,
        ),
        (
            {"branding_style": "__FIP-EN__"},
            False,
        ),
        (
            {"branding_style": "__FIP-FR__"},
            False,
        ),
        (
            {"branding_style": sample_uuid()},
            True,
        ),
    ),
)
def test_email_branding_preview(
    client_request,
    mock_get_email_branding,
    extra_args,
    email_branding_retrieved,
):
    client_request.get("main.email_template", _test_page_title=False, **extra_args)
    assert mock_get_email_branding.called is email_branding_retrieved


@pytest.mark.skip(reason="feature not in use")
@pytest.mark.parametrize(
    "branding_style, filename",
    [
        ("hm-government", "hm-government"),
        (None, "no-branding"),
        (FieldWithLanguageOptions.ENGLISH_OPTION_VALUE, "no-branding"),
    ],
)
def test_letter_template_preview_links_to_the_correct_image(
    client_request,
    mocker,
    mock_get_letter_branding_by_id,
    branding_style,
    filename,
):
    page = client_request.get("main.letter_template", _test_page_title=False, branding_style=branding_style)

    image_link = page.find("img")["src"]

    assert image_link == url_for("main.letter_branding_preview_image", filename=filename, page=1)


def test_letter_template_preview_headers(
    client,
    mock_get_letter_branding_by_id,
):
    response = client.get(url_for("main.letter_template", branding_style="hm-government"))

    assert response.headers.get("X-Frame-Options") == "SAMEORIGIN"


@pytest.mark.parametrize(
    "query_key, query_value, heading",
    [
        ("lang", "en", "GC Notify"),  # 'Notify' = english heading
        ("lang", "fr", "Notification GC"),  # 'Notification' = french heading
        ("lang", "sa?SDFa?DFa,/", "GC Notify"),
        ("xyz", "xyz", "GC Notify"),
        ("sa?SDFa?DFa,/", "sa?SDFa?DFa,/", "GC Notify"),
    ],
)
def test_query_params(client, query_key, query_value, heading, mocker, mock_calls_out_to_GCA):
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": services[0]})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )
    response = client.get(url_for("main.index", **{query_key: query_value}))

    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    assert page.select_one("#gc-title").text.strip() == (heading)


def test_should_render_welcome(client):
    response = client.get(url_for("main.welcome"))
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    assert page.h1.string == "Welcome to GC Notify"

    expected = "Create your first service"
    link_text = page.find_all("a", {"class": "button"})[0].text
    assert link_text == expected
