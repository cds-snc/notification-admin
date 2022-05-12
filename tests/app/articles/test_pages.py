import json
from unittest.mock import MagicMock, Mock

import pytest
import requests
import requests_mock

from app.articles import GC_ARTICLES_CACHE_PREFIX, GC_ARTICLES_FALLBACK_CACHE_PREFIX
from app.articles.pages import get_page_by_slug_with_cache
from tests import MockRedis

gc_articles_api = "articles.alpha.canada.ca/notification-gc-notify"
gc_articles_url = f"https://{gc_articles_api}/wp-json"
endpoint = "wp/v2/pages"
request_url = f"{gc_articles_url}/{endpoint}"

params = {"slug": "mypage", "lang": "en"}
cache_key = f"{GC_ARTICLES_CACHE_PREFIX}{endpoint}/en/mypage"
fallback_cache_key = f"{GC_ARTICLES_FALLBACK_CACHE_PREFIX}{endpoint}/en/mypage"

response_json = json.dumps({"content": {"rendered": "The Content"}, "title": {"rendered": "The Title"}})


def test_get_page_by_slug_with_cache_retrieve_from_cache(app_, mocker):
    redis_cache = {cache_key: json.dumps(response_json)}

    mock_redis_obj = MockRedis(redis_cache)
    mock_redis_method = MagicMock()
    mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
    mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)

    mocker.patch("app.articles.pages.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as request_mock:
            request_mock.get(request_url, json=response_json, status_code=200)

            get_page_by_slug_with_cache(endpoint, params)

            assert mock_redis_method.get.called
            assert mock_redis_method.get.call_count == 1
            assert mock_redis_method.get.called_with(cache_key)
            assert mock_redis_method.get(cache_key) is not None

            assert not request_mock.called


def test_get_page_by_slug_with_cache_miss_with_fallback(app_, mocker):
    redis_cache = {fallback_cache_key: json.dumps(response_json)}
    mock_redis_obj = MockRedis(redis_cache)
    mock_redis_method = MagicMock()
    mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
    mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)

    mocker.patch("app.articles.pages.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as request_mock:
            request_mock.get(request_url, exc=requests.exceptions.ConnectionError)

            assert mock_redis_method.get(cache_key) is None

            get_page_by_slug_with_cache(endpoint, params)

            assert request_mock.called

            assert mock_redis_method.get.called
            assert mock_redis_method.get.call_count == 2
            assert mock_redis_method.get.called_with(cache_key)

            """ Should fall through to the fallback cache """
            assert mock_redis_method.get.called_with(fallback_cache_key)
            assert mock_redis_method.get(fallback_cache_key) is not None
            assert mock_redis_method.get(fallback_cache_key) == json.dumps(response_json)


def test_bad_slug_doesnt_save_empty_cache_entry(app_, mocker):
    mock_redis_obj = MockRedis()
    mock_redis_method = MagicMock()
    mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
    mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)

    mocker.patch("app.articles.pages.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as request_mock:
            request_mock.get(request_url, json={}, status_code=404)

            assert mock_redis_method.get(cache_key) is None

            get_page_by_slug_with_cache(endpoint, params)

            assert request_mock.called

            assert mock_redis_method.get.called
            assert mock_redis_method.get.call_count == 2
            assert mock_redis_method.get.called_with(cache_key)
            assert mock_redis_method.get.called_with(fallback_cache_key)
            assert not mock_redis_method.set.called


@pytest.mark.parametrize("url", ["/a11y", "/why-notify", "/personalise", "/format"])
def test_gca_redirects_work(client_request, mocker, url):
    """
    This test ensures that the pages we renamed properly provide a permanent redirect, and exist in GCA
    """

    # ensure each url is a permenent redirect
    client_request.get_url(url, _expected_status=301)

    # ensure target location exists and returns content
    page = client_request.get_url(url, _follow_redirects=True)
    assert page.find("span", id="gc-title").text.strip() == "GC Notify"


@pytest.mark.parametrize(
    "url",
    [
        "/why-gc-notify",
        "/features",
        "/guidance",
        "/security",
        "/privacy",
        "/accessibility",
        "/terms",
        "/pourquoi-gc-notification?lang=fr",
        "/fonctionnalites?lang=fr",
        "/guides-reference?lang=fr",
        "/securite?lang=fr",
        "/confidentialite?lang=fr",
        "/accessibilite?lang=fr",
        "/conditions-dutilisation?lang=fr",
    ],
)
def test_gca_content_exists_en_fr(client_request, mocker, url):
    """
    This test is ensures the content we link to exists on GCA.  If someone removes a page on GCA, this will fail.
    """

    # ensure target location exists and returns content
    page = client_request.get_url(url, _expected_status=200)
    assert (
        page.find("span", id="gc-title").text.strip() == "GC Notify"
        or page.find("span", id="gc-title").text.strip() == "GC Notification"
    )
