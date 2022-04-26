from typing import Optional

from flask import current_app, json

from app import get_current_locale
from app.articles import GC_ARTICLES_CACHE_PREFIX, GC_ARTICLES_NAV_CACHE_TTL
from app.articles.api import get_content
from app.extensions import redis_client


def get_nav_items() -> Optional[list]:
    locale = get_current_locale(current_app)
    items = _get_nav_wp(locale)
    return items


def _get_nav_wp(locale: str) -> Optional[list]:
    nav_url = "menus/v1/menus/notify-admin"
    if locale == "fr":
        nav_url = "menus/v1/menus/notify-admin-fr"

    cache_key = f"{GC_ARTICLES_CACHE_PREFIX}{nav_url}"

    cached = redis_client.get(cache_key)
    if cached is not None:
        current_app.logger.info(f"Cache hit: {cache_key}")
        nav_response = json.loads(cached)
    else:
        nav_response = get_content(nav_url)
        current_app.logger.info(f"Saving menu to cache: {cache_key}")
        redis_client.set(cache_key, json.dumps(nav_response), ex=GC_ARTICLES_NAV_CACHE_TTL)

    nav_items = None

    if isinstance(nav_response, dict) and "items" in nav_response:
        nav_items = []
        for item in nav_response["items"]:
            nav_items.append({k: item[k] for k in ("title", "url", "target", "description")})

        """always append a link called "preview", so that 'check_path' will find it"""
        nav_items.append({"title": "preview", "url": "/preview", "target": "", "description": ""})

    return nav_items
