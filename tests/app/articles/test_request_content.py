import pytest
import requests_mock
from werkzeug.exceptions import Forbidden

from app.articles.api import get_content

gc_articles_api = "articles.cdssandbox.xyz/notification-gc-notify"
notify_url = f"https://{gc_articles_api}/wp-json/pages"


# pytest ./tests/app/articles/test_request_content.py -k test_request_content
def test_get_content_en(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            response_json = {"title": {"rendered": "The Title"}, "content": {"rendered": "The Content"}}
            mock.request("GET", notify_url, json=response_json, status_code=200)
            response = get_content("pages", {"slug": "mypage", "lang": "en"}, cacheable=False)

            assert mock.called
            assert mock.call_count == 1
            assert mock.request_history[0].url == f"{notify_url}?slug=mypage&lang=en"

            assert isinstance(response, dict)
            assert response["title"]["rendered"] == "The Title"
            assert response["content"]["rendered"] == "The Content"


def test_get_content_fr(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.cdssandbox.xyz/notification-gc-notify"})
        with requests_mock.mock() as mock:
            response_json = {"title": {"rendered": "Le titre"}, "content": {"rendered": "Le contentu"}}
            mock.request("GET", notify_url, json=response_json, status_code=200)
            response = get_content("pages", {"slug": "la-page", "lang": "fr"})

            assert mock.called
            assert mock.call_count == 1
            assert mock.request_history[0].url == f"{notify_url}?slug=la-page&lang=fr"

            assert isinstance(response, dict)
            assert response["title"]["rendered"] == "Le titre"
            assert response["content"]["rendered"] == "Le contentu"


def test_get_content_403(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.cdssandbox.xyz/notification-gc-notify"})
        with requests_mock.mock() as mock:
            response_json = {}
            mock.request("GET", notify_url, json=response_json, status_code=403)

            with pytest.raises(Forbidden) as exception:
                get_content("pages", {"slug": "mypage", "lang": "en"})

            assert "403 Forbidden" in str(exception.value)
