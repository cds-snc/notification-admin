import pytest
import requests_mock
from werkzeug.exceptions import NotFound

from app.articles import request_content

gc_articles_api = "articles.alpha.canada.ca/notification-gc-notify"
notify_url = f"https://{gc_articles_api}/wp-json/pages"


# pytest ./tests/app/articles/test_request_content.py -k test_request_content
def test_request_content_en(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="en")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            response_json = {"title": {"rendered": "The Title"}, "content": {"rendered": "The Content"}}
            mock.request("GET", notify_url, json=response_json, status_code=200)
            response = request_content("pages", {"slug": "mypage"})

            assert mock.called
            assert mock.call_count == 1
            assert mock.request_history[0].url == f"{notify_url}?slug=mypage&lang=en"

            assert isinstance(response, dict)
            assert response["title"]["rendered"] == "The Title"
            assert response["content"]["rendered"] == "The Content"


def test_request_content_fr(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="fr")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.alpha.canada.ca/notification-gc-notify"})
        with requests_mock.mock() as mock:
            response_json = {"title": {"rendered": "Le titre"}, "content": {"rendered": "Le contentu"}}
            mock.request("GET", notify_url, json=response_json, status_code=200)
            response = request_content("pages", {"slug": "la-page"})

            assert mock.called
            assert mock.call_count == 1
            assert mock.request_history[0].url == f"{notify_url}?slug=la-page&lang=fr"

            assert isinstance(response, dict)
            assert response["title"]["rendered"] == "Le titre"
            assert response["content"]["rendered"] == "Le contentu"


def test_request_content_en_404_but_fr_exists(app_, mocker, capsys):
    def json_callback(request, context):
        if "lang=en" in request.query:
            return []

        return {"title": {"rendered": "Le titre"}, "content": {"rendered": "Le contentu"}}

    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="en")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            mock.request("GET", notify_url, json=json_callback, status_code=200)
            response = request_content("pages", {"slug": "la-page"})

            # make sure requests is called twice, with 2 different language parameters
            assert mock.called
            assert mock.call_count == 2
            assert mock.request_history[0].url == f"{notify_url}?slug=la-page&lang=en"
            assert mock.request_history[1].url == f"{notify_url}?slug=la-page&lang=fr"

            # response should be url for the language switcher, as a string
            assert isinstance(response, str)
            assert response == "/set-lang?from=/la-page"


def test_request_content_en_404_but_fr_doesnt_exist(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="en")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            mock.request("GET", notify_url, json=[], status_code=200)

            # make sure request_content reaises a "Not Found" exception here
            with pytest.raises(NotFound):
                request_content("pages", {"slug": "la-nouvelle-page"})

            # make sure requests is called twice, with 2 different language parameters
            assert mock.called
            assert mock.call_count == 2
            assert mock.request_history[0].url == f"{notify_url}?slug=la-nouvelle-page&lang=en"
            assert mock.request_history[1].url == f"{notify_url}?slug=la-nouvelle-page&lang=fr"


@pytest.mark.skip(reason="Work in progress")
def test_request_content_403(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="en")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.alpha.canada.ca/notification-gc-notify"})
        with requests_mock.mock() as mock:
            response_json = {}
            mock.request("GET", notify_url, json=response_json, status_code=403)

            request_content("pages", {"slug": "mypage"})
            assert True is False
