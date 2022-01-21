from typing import Optional, Union

import requests
from flask import abort, current_app, json
from werkzeug.exceptions import NotFound, Unauthorized

from app import cache, get_current_locale

GC_ARTICLES_PAGE_CACHE_TTL = 86400
GC_ARTICLES_AUTH_TOKEN_CACHE_TTL = 86400
GC_ARTICLES_AUTH_API_ENDPOINT = "/wp-json/jwt-auth/v1/token"
GC_ARTICLES_AUTH_TOKEN_CACHE_KEY = "gc_articles_bearer_token"
REQUEST_TIMEOUT = 5


def set_active_nav_item(items=[], url="") -> None:
    for item in items:
        item["active"] = True if item["url"] == url else False


def validate_token(token):
    auth_endpoint = GC_ARTICLES_AUTH_API_ENDPOINT
    base_endpoint = current_app.config["GC_ARTICLES_API"]

    url = f"https://{base_endpoint}{auth_endpoint}/validate"

    headers = {"Authorization": "Bearer {}".format(token)}

    res = requests.post(url=url, headers=headers, timeout=REQUEST_TIMEOUT)

    return res.status_code == 200


def authenticate(username, password, base_endpoint) -> Union[str, None]:
    auth_endpoint = GC_ARTICLES_AUTH_API_ENDPOINT

    url = f"https://{base_endpoint}{auth_endpoint}"

    # If we have a token cached, check if it's still valid and return it
    if cache.get(GC_ARTICLES_AUTH_TOKEN_CACHE_KEY):
        token = cache.get(GC_ARTICLES_AUTH_TOKEN_CACHE_KEY)
        if validate_token(token):
            return token

    try:
        # Otherwise get a fresh one
        res = requests.post(url=url, data={"username": username, "password": password}, timeout=REQUEST_TIMEOUT)

        parsed = json.loads(res.text)

        cache.set(GC_ARTICLES_AUTH_TOKEN_CACHE_KEY, parsed["token"], timeout=GC_ARTICLES_AUTH_TOKEN_CACHE_TTL)

        return parsed["token"]
    except Exception:
        return None


def request_content(endpoint: str, params={"slug": ""}, auth_required=False) -> Union[dict, None]:
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    username = current_app.config["GC_ARTICLES_API_AUTH_USERNAME"]
    password = current_app.config["GC_ARTICLES_API_AUTH_PASSWORD"]
    slug = params["slug"]

    lang_endpoint = ""
    lang = get_current_locale(current_app)
    cache_key = f"{endpoint}/{lang}/{slug}"
    headers = {}

    if auth_required:
        token = authenticate(username, password, base_endpoint)

        headers = {"Authorization": "Bearer {}".format(token)}

    if lang == "fr":
        lang_endpoint = "/fr"

    try:
        url = f"https://{base_endpoint}{lang_endpoint}/wp-json/{endpoint}"
        response = requests.get(url, params, headers=headers, timeout=REQUEST_TIMEOUT)
        parsed = json.loads(response.content)

        if response.status_code == 403:
            raise Unauthorized()

        if response.status_code >= 400 or not parsed:
            # Getting back a 4xx or 5xx status code
            current_app.logger.info(
                f"Error requesting content. URL: {url}, params: {params}, status: {response.status_code}, data: {parsed}"
            )
            raise NotFound()

        current_app.logger.info(f"Saving to cache: {cache_key}")
        cache.set(cache_key, parsed, timeout=GC_ARTICLES_PAGE_CACHE_TTL)

        if isinstance(parsed, list):
            return parsed[0]

        return parsed
    except NotFound:
        abort(404)
    except Unauthorized:
        abort(403)
    except ConnectionError:
        if cache.get(cache_key):
            current_app.logger.info(f"Cache hit: {cache_key}")
            return cache.get(cache_key)
        else:
            current_app.logger.info(f"Cache miss: {cache_key}")
            return None
    except Exception:
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
