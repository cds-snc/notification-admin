import pytest

from app.asset_fingerprinter import asset_fingerprinter

service = [
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
    }
]


def test_presence_of_security_headers(client, mocker, mock_calls_out_to_GCA):
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": service})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )

    response = client.get("/")

    assert response.status_code == 200

    assert "Strict-Transport-Security" in response.headers
    assert response.headers["Strict-Transport-Security"] == "max-age=63072000; includeSubDomains; preload"

    assert "Referrer-Policy" in response.headers
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_owasp_useful_headers_set(client, mocker, mock_get_service_and_organisation_counts, mock_calls_out_to_GCA):
    # Given...
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": service})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )

    nonce = "PTV4HSwytpCSrW4v001LB5qKL-Hp0QyMJiGqNnKV2no"
    mocker.patch("app.safe_get_request_nonce", return_value=nonce)

    # When...
    response = client.get("/")

    # Then...
    assert response.status_code == 200
    assert response.headers["X-Frame-Options"] == "deny"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
    assert response.headers["Content-Security-Policy"] == (
        "report-uri https://csp-report-to.security.cdssandbox.xyz/report;"
        "default-src 'self' static.example.com 'unsafe-inline';"
        f"script-src 'self' static.example.com *.google-analytics.com *.googletagmanager.com https://tagmanager.google.com https://js-agent.newrelic.com 'nonce-{nonce}' 'unsafe-eval' data:;"
        f"script-src-elem 'self' *.siteintercept.qualtrics.com https://siteintercept.qualtrics.com 'nonce-{nonce}' 'unsafe-eval' data:;"
        "connect-src 'self' *.google-analytics.com *.googletagmanager.com *.siteintercept.qualtrics.com https://siteintercept.qualtrics.com;"
        "object-src 'self';"
        "style-src 'self' *.googleapis.com https://tagmanager.google.com https://fonts.googleapis.com 'unsafe-inline';"
        "font-src 'self' static.example.com *.googleapis.com *.gstatic.com data:;"
        "img-src "
        "'self' static.example.com *.canada.ca *.cdssandbox.xyz *.google-analytics.com *.googletagmanager.com *.notifications.service.gov.uk *.gstatic.com https://siteintercept.qualtrics.com data:;"  # noqa: E501
        "frame-src 'self' www.googletagmanager.com www.youtube.com https://cdssnc.qualtrics.com/;"
    )


@pytest.mark.parametrize(
    "url, use_fingerprinting, cache_headers",
    [
        (
            "stylesheets/index.css",
            True,
            "public, max-age=31536000, immutable",
        ),
        (
            "images/favicon.ico",
            True,
            "public, max-age=31536000, immutable",
        ),
        (
            "javascripts/main.min.js",
            True,
            "public, max-age=31536000, immutable",
        ),
        ("/robots.txt", False, "no-store, no-cache, private, must-revalidate"),
    ],
    ids=["CSS file", "image", "JS file", "static page"],
)
def test_headers_cache_static_assets(client, url, use_fingerprinting, cache_headers):

    if use_fingerprinting:
        url = asset_fingerprinter.get_url(url)

    response = client.get(url)

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == cache_headers


def test_headers_non_ascii_characters_are_replaced(
    client, mocker, mock_get_service_and_organisation_counts, mock_calls_out_to_GCA
):
    mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": service})
    mocker.patch(
        "app.service_api_client.get_stats_by_month",
        return_value={"data": [("2020-11-01", "email", 20)]},
    )

    nonce = "PTV4HSwytpCSrW4v001LB5qKL-Hp0QyMJiGqNnKV2no"
    mocker.patch("app.safe_get_request_nonce", return_value=nonce)

    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["Content-Security-Policy"] == (
        "report-uri https://csp-report-to.security.cdssandbox.xyz/report;"
        "default-src 'self' static.example.com 'unsafe-inline';"
        f"script-src 'self' static.example.com *.google-analytics.com *.googletagmanager.com https://tagmanager.google.com https://js-agent.newrelic.com 'nonce-{nonce}' 'unsafe-eval' data:;"
        f"script-src-elem 'self' *.siteintercept.qualtrics.com https://siteintercept.qualtrics.com 'nonce-{nonce}' 'unsafe-eval' data:;"
        "connect-src 'self' *.google-analytics.com *.googletagmanager.com *.siteintercept.qualtrics.com https://siteintercept.qualtrics.com;"
        "object-src 'self';"
        "style-src 'self' *.googleapis.com https://tagmanager.google.com https://fonts.googleapis.com 'unsafe-inline';"
        "font-src 'self' static.example.com *.googleapis.com *.gstatic.com data:;"
        "img-src "
        "'self' static.example.com *.canada.ca *.cdssandbox.xyz *.google-analytics.com *.googletagmanager.com *.notifications.service.gov.uk *.gstatic.com https://siteintercept.qualtrics.com data:;"  # noqa: E501
        "frame-src 'self' www.googletagmanager.com www.youtube.com https://cdssnc.qualtrics.com/;"
    )
