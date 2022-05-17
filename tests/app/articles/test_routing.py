import pytest

from app.articles.routing import gca_url_for


@pytest.mark.parametrize("route, lang, expectedURL", [("home", "en", "/home"), ("home", "fr", "/acceuil")])
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
    "route, lang, expectedURL", [("home", "en", "http://localhost/home"), ("home", "fr", "http://localhost/acceuil")]
)
def test_gca_url_for_creates_asbolute_url(app_, mocker, route, lang, expectedURL):
    mocker.patch("app.articles.routing.get_current_locale", return_value=lang)
    mocker.patch("app.articles.routing.url_for", return_value="http://localhost")
    route = gca_url_for(route, _external=True)

    assert route == expectedURL
