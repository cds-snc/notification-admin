import json
from unittest.mock import MagicMock, Mock

import requests
import requests_mock

from app.articles import (
    GC_ARTICLES_FALLBACK_CACHE_PREFIX,
    GC_ARTICLES_FALLBACK_CACHE_TTL,
)
from app.articles.api import get_content
from tests import MockRedis

gc_articles_api = "articles.alpha.canada.ca/notification-gc-notify"
notify_url = f"https://{gc_articles_api}/wp-json"
endpoint = "wp/v2/pages"
request_url = f"{notify_url}/{endpoint}"

mock_redis_obj = MockRedis()
mock_redis_method = MagicMock()
mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)

response_json = json.dumps({"content": {"rendered": "The Content"}, "title": {"rendered": "The Title"}})
cache_key = f"{GC_ARTICLES_FALLBACK_CACHE_PREFIX}{endpoint}/en/mypage"


def test_save_to_long_term_cache(app_, mocker):
    mocker.patch("app.articles.api.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            mock.request("GET", request_url, json=response_json, status_code=200)
            response = get_content(endpoint, {"slug": "mypage", "lang": "en"}, cacheable=True)

            assert mock_redis_method.set.called
            assert mock_redis_method.set.call_count == 1

            mock_redis_method.set.assert_called_with(cache_key, json.dumps(response), ex=GC_ARTICLES_FALLBACK_CACHE_TTL)


def test_dont_cache_on_404(app_, mocker):
    mocker.patch("app.articles.api.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            mock.get(request_url, json={}, status_code=404)
            get_content(endpoint, {"slug": "mypage", "lang": "en"}, cacheable=True)

            """ Do not call cache.set """
            assert not mock_redis_method.set.called


def test_retrieve_existing_from_fallback_cache_on_http_error(app_, mocker):
    redis_cache = {cache_key: json.dumps(response_json)}

    mock_redis_obj = MockRedis(redis_cache)
    mock_redis_method = MagicMock()
    mock_redis_method.get = Mock(side_effect=mock_redis_obj.get)
    mock_redis_method.set = Mock(side_effect=mock_redis_obj.set)
    mocker.patch("app.articles.api.redis_client", mock_redis_method)

    with app_.test_request_context():
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
        with requests_mock.mock() as mock:
            """ConnectionError during retrieval"""
            mock.get(request_url, exc=requests.exceptions.ConnectionError)

            get_content(endpoint, {"slug": "mypage", "lang": "en"}, cacheable=True)

            assert mock_redis_method.get.called
            assert mock_redis_method.get.called_with(cache_key)
            assert mock_redis_method.get(cache_key) == json.dumps(response_json)
