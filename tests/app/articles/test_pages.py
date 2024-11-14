import json
from unittest.mock import MagicMock, Mock, call

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
            mock_redis_method.get.assert_called_with(cache_key)
            assert mock_redis_method.get(cache_key) is not None

            assert not request_mock.called


def test_get_page_by_slug_with_cache_miss_with_fallback(app_, mocker):
    redis_cache = {fallback_cache_key: json.dumps(response_json)}
    mock_redis_obj = MockRedis(redis_cache)
    mock_redis_method = MagicMock()
    mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
    mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)

    mocker.patch("app.articles.pages.redis_client", mock_redis_method)
    mocker.patch("app.articles.api.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as request_mock:
            request_mock.get(request_url, exc=requests.exceptions.ConnectionError)

            # note that there's a get here
            assert mock_redis_method.get(cache_key) is None

            # should be 2 gets here, one for the cache, one for the fallback
            get_page_by_slug_with_cache(endpoint, params)

            assert request_mock.called

            assert mock_redis_method.get.called
            assert mock_redis_method.get.call_count == 3
            
            """ Should fall through to the fallback cache """
            calls = [call(cache_key), call(cache_key), call(fallback_cache_key)]
            mock_redis_method.get.assert_has_calls(calls)
            assert mock_redis_method.get(fallback_cache_key) is not None
            assert mock_redis_method.get(fallback_cache_key) == json.dumps(response_json)


def test_bad_slug_doesnt_save_empty_cache_entry(app_, mocker):
    mock_redis_obj = MockRedis()
    mock_redis_method = MagicMock()
    mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
    mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)

    mocker.patch("app.articles.pages.redis_client", mock_redis_method)
    mocker.patch("app.articles.api.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as request_mock:
            request_mock.get(request_url, json={}, status_code=404)

            # note that there's a get here
            assert mock_redis_method.get(cache_key) is None

            # should be just one get here - no fallback since we connected to articles and got a 404
            get_page_by_slug_with_cache(endpoint, params)

            assert request_mock.called

            assert mock_redis_method.get.called
            assert mock_redis_method.get.call_count == 2
            calls = [call(cache_key), call(cache_key)]
            mock_redis_method.get.assert_has_calls(calls)
            assert not mock_redis_method.set.called


@pytest.mark.parametrize(
    "url", ["/a11y", "/why-notify", "/personalise", "/format", "/messages-status", "/pourquoi-gc-notification"]
)
def test_gca_redirects_work(client_request, mocker, url):
    """
    This test ensures that the pages we renamed properly provide a permanent redirect
    """

    mocker.patch("app.main.views.index.get_page_by_slug", return_value={"some": "value"})
    mocker.patch("app.main.views.index._render_articles_page", return_value="")

    # ensure each url is a permenent redirect
    client_request.get_url(url, _expected_status=301)
