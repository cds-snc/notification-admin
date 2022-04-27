import json
from unittest.mock import MagicMock, Mock
import requests

import requests_mock

from app.articles import GC_ARTICLES_CACHE_PREFIX
from app.articles.pages import get_page_by_slug_with_cache
from tests import MockRedis

gc_articles_api = "articles.alpha.canada.ca/notification-gc-notify"
notify_url = f"https://{gc_articles_api}/wp-json"
endpoint = "wp/v2/pages"
request_url = f"{notify_url}/{endpoint}"

params = {"slug": "mypage", "lang": "en"}
cache_key = f"{GC_ARTICLES_CACHE_PREFIX}{endpoint}/en/mypage"

response_json = json.dumps({"content": {"rendered": "The Content"}, "title": {"rendered": "The Title"}})

redis_cache = {"gc-articles--wp/v2/pages/en/mypage": json.dumps(response_json)}

mock_redis_obj = MockRedis(redis_cache)
mock_redis_method = MagicMock()
mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)


def test_get_page_by_slug_with_cache_retrieve_from_cache(app_, mocker):
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
    redis_cache = {"gc-articles-fallback--pages/en/mypage": json.dumps(response_json)}
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
            assert mock_redis_method.get.called_with("gc-articles-fallback--pages/en/mypage")
            assert mock_redis_method.get("gc-articles-fallback--pages/en/mypage") is not None
            assert mock_redis_method.get("gc-articles-fallback--pages/en/mypage") == json.dumps(response_json)
