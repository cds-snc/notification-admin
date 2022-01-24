import pytest
import requests_mock

from app.articles import request_content

gc_articles_api = "articles.cdssandbox.xyz/notification-gc-notify"
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
            assert mock.request_history[0].url == f"{notify_url}?slug=mypage&lang=en"

            assert response is not None
            assert response["title"]["rendered"] == "The Title"
            assert response["content"]["rendered"] == "The Content"


def test_request_content_fr(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="fr")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.cdssandbox.xyz/notification-gc-notify"})
        with requests_mock.mock() as mock:
            response_json = {"title": {"rendered": "Le titre"}, "content": {"rendered": "Le contentu"}}
            mock.request("GET", notify_url, json=response_json, status_code=200)
            response = request_content("pages", {"slug": "la-page"})

            assert mock.called
            assert mock.request_history[0].url == f"{notify_url}?slug=la-page&lang=fr"

            assert response is not None
            assert response["title"]["rendered"] == "Le titre"
            assert response["content"]["rendered"] == "Le contentu"


@pytest.mark.skip(reason="Work in progress")
def test_request_content_403(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.articles.get_current_locale", return_value="en")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.cdssandbox.xyz/notification-gc-notify"})
        with requests_mock.mock() as mock:
            response_json = {}
            mock.request("GET", notify_url, json=response_json, status_code=403)

            request_content("pages", {"slug": "mypage"})
            assert True is False
