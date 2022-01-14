from typing import Optional, Union

import requests
from flask import current_app, json
from werkzeug.exceptions import NotFound

from app import cache, get_current_locale

GC_ARTICLES_CACHE_TTL = 86400


def find_item_url(items=[], url="") -> bool:
    found = list(filter(lambda item: item["url"] == url, items))
    return len(found) != 0


def set_active_nav_item(items=[], url="") -> None:
    for item in items:
        item["active"] = True if item["url"] == url else False


def request_content(endpoint: str, params={"slug": ""}) -> Union[dict, None]:
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    lang_endpoint = ""
    lang = get_current_locale(current_app)
    cache_key = "%s/%s" % (lang, params["slug"])

    if lang == "fr":
        lang_endpoint = "/fr"

    try:
        url = f"https://{base_endpoint}{lang_endpoint}/wp-json/{endpoint}"
        response = requests.get(url, params)
        parsed = json.loads(response.content)

        if response.status_code >= 400 or not parsed:
            # Getting back a 4xx or 5xx status code
            current_app.logger.info(
                f"Error requesting content. URL: {url}, params: {params}, status: {response.status_code}, data: {parsed}"
            )
            raise NotFound()

        current_app.logger.info(f"Saving to cache: {cache_key}")
        cache.set(cache_key, parsed, timeout=GC_ARTICLES_CACHE_TTL)

        if isinstance(parsed, list):
            return parsed[0]

        return parsed
    except Exception:
        if cache.get(cache_key):
            current_app.logger.info(f"Cache hit: {cache_key}")
            return cache.get(cache_key)
        else:
            current_app.logger.info(f"Cache miss: {cache_key}")
            return None


def get_nav_items() -> Optional[list]:
    # @todo add caching
    locale = get_current_locale(current_app)
    items = _get_nav_wp(locale)
    return items


def _get_nav_wp(locale: str) -> Optional[list]:
    nav_url = "menus/v1/menus/notify-admin"
    if locale == "fr":
        nav_url = "menus/v1/menus/notify-admin-fr"

    nav_response = request_content(nav_url)
    nav_items = None

    if isinstance(nav_response, dict) and "items" in nav_response:
        nav_items = []
        for item in nav_response["items"]:
            nav_items.append({k: item[k] for k in ("title", "url", "target", "description")})

        # always append a link called "preview", so that 'check_path' will find it
        nav_items.append({"title": "preview", "url": "/preview", "target": "", "description": ""})

    return nav_items
