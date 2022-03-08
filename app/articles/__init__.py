from datetime import timedelta
from typing import Optional, Union

import requests
from flask import abort, current_app, json
from werkzeug.exceptions import NotFound, Unauthorized

from app import get_current_locale
from app.articles.api import get_content
from app.extensions import redis_client

GC_ARTICLES_CACHE_PREFIX = "gc-articles--"
GC_ARTICLES_NAV_CACHE_TTL = int(timedelta(days=5).total_seconds())

def _get_alt_locale(locale):
    return "fr" if locale == "en" else "en"


def set_active_nav_item(items=[], url="") -> None:
    for item in items:
        item["active"] = True if item["url"] == url else False


def get_nav_items() -> Optional[list]:
    # @todo add caching
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

        # always append a link called "preview", so that 'check_path' will find it
        nav_items.append({"title": "preview", "url": "/preview", "target": "", "description": ""})

    return nav_items


# Return URL path for the language switcher
def get_lang_url(response: dict, has_page_id: bool) -> str:
    # url either looks like:
    # - /preview?id=11
    # - /wild-card

    alt_lang = _get_alt_locale(get_current_locale(current_app))

    if has_page_id:
        if response.get(f"id_{alt_lang}"):
            lang_id = response.get(f"id_{alt_lang}")
            return f"/preview?id={lang_id}"
        else:
            # if no translated page id, return 404 explicitly
            return "/404"

    lang_slug = response.get(f"slug_{alt_lang}") or response.get("slug")
    # if no translated page slug, this will 404 by itself
    return f"/{lang_slug}"


# Return URL for the "Edit this page" link in the preview banner header
def get_preview_url(page_id: int) -> str:
    lang = get_current_locale(current_app)
    base_endpoint = current_app.config["GC_ARTICLES_API"]

    return f"https://{base_endpoint}/wp-admin/post.php?post={page_id}&action=edit&lang={lang}"
