from typing import Union

from flask import current_app, json

from app import get_current_locale
from app.articles import GC_ARTICLES_CACHE_PREFIX, GC_ARTICLES_DEFAULT_CACHE_TTL
from app.articles.api import get_content
from app.extensions import redis_client


# Cached
def get_page_by_slug_with_cache(endpoint: str, params={"slug": ""}) -> Union[dict, None]:
    lang = get_current_locale(current_app)
    slug = params.get("slug")
    cache_key = f"{GC_ARTICLES_CACHE_PREFIX}{endpoint}/{lang}/{slug}"

    cached = redis_client.get(cache_key)

    if cached is not None:
        current_app.logger.info(f"Cache hit: {cache_key}")
        response = json.loads(cached)
    else:
        response = get_page_by_slug(endpoint, params)

        current_app.logger.info(f"Saving menu to cache: {cache_key}")
        redis_client.set(cache_key, json.dumps(response), ex=GC_ARTICLES_DEFAULT_CACHE_TTL)

    return response


# Not cached
def get_page_by_slug(endpoint: str, params={"slug": ""}) -> Union[dict, None]:
    return get_content(endpoint, params, auth_required=False)


# Not cached
def get_page_by_id(endpoint: str) -> Union[dict, None]:
    return get_content(endpoint, auth_required=True, cacheable=False)
