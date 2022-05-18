import pytest
from flask import session

from app.articles.routing import GC_ARTICLES_ROUTES, gca_url_for


@pytest.mark.parametrize("route, lang, expectedURL", [("home", "en", "/home"), ("home", "fr", "/accueil")])
def test_gca_url_for_works_with_valid_routes(mocker, route, lang, expectedURL):
    mocker.patch("app.articles.routing.get_current_locale", return_value=lang)

    route = gca_url_for(route)
    assert route == expectedURL


@pytest.mark.parametrize("route, lang", [("homez", "en"), ("homez", "fr")])
def test_gca_url_for_fails_with_invalid_routes(mocker, route, lang):
    mocker.patch("app.articles.routing.get_current_locale", return_value=lang)
    with pytest.raises(Exception):
        gca_url_for(route)


@pytest.mark.parametrize(
    "route, lang, expectedURL", [("home", "en", "http://localhost/home"), ("home", "fr", "http://localhost/accueil")]
)
def test_gca_url_for_creates_asbolute_url(app_, mocker, route, lang, expectedURL):
    mocker.patch("app.articles.routing.get_current_locale", return_value=lang)
    mocker.patch("app.articles.routing.url_for", return_value="http://localhost")
    route = gca_url_for(route, _external=True)

    assert route == expectedURL


@pytest.mark.parametrize("route", list(GC_ARTICLES_ROUTES))
def test_ensure_all_french_gca_routes_in_GC_ARTICLES_ROUTES_exist(client_request, mocker, route):

    mocker.patch("app.articles.routing.get_current_locale", return_value="fr")
    mocker.patch("app.main.views.index.get_current_locale", return_value="fr")
    render_article = mocker.patch("app.main.views.index._render_articles_page", return_value="")

    url = gca_url_for(route)
    page = client_request.get_url(url, _expected_status=200, _test_page_title=False)

    assert render_article.called


@pytest.mark.parametrize("route", list(GC_ARTICLES_ROUTES))
def test_ensure_all_english_gca_routes_in_GC_ARTICLES_ROUTES_exist(client_request, mocker, route):

    mocker.patch("app.articles.routing.get_current_locale", return_value="en")
    mocker.patch("app.main.views.index.get_current_locale", return_value="en")
    render_article = mocker.patch("app.main.views.index._render_articles_page", return_value="")

    url = gca_url_for(route)
    page = client_request.get_url(url, _expected_status=200, _test_page_title=False)

    assert render_article.called
