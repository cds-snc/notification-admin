from typing import Optional, Union

import requests
from flask import abort, current_app, json, redirect, render_template, request
from werkzeug.exceptions import NotFound, Unauthorized

from app import cache, get_current_locale
from app.utils import get_latest_stats

GC_ARTICLES_PAGE_CACHE_TTL = 86400
GC_ARTICLES_AUTH_TOKEN_CACHE_TTL = 86400
GC_ARTICLES_AUTH_API_ENDPOINT = "/wp-json/jwt-auth/v1/token"
GC_ARTICLES_AUTH_TOKEN_CACHE_KEY = "gc-articles-bearer-token"
REQUEST_TIMEOUT = 5


def _get_alt_locale(locale):
    return "fr" if locale == "en" else "en"


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


def request_content(endpoint: str, params={"slug": ""}, auth_required=False) -> Union[dict, str, None]:
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    username = current_app.config["GC_ARTICLES_API_AUTH_USERNAME"]
    password = current_app.config["GC_ARTICLES_API_AUTH_PASSWORD"]

    # strip {"slug": "preview"} from dict but keep everything else
    request_params = {k: v for k, v in params.items() if v != "preview"}
    slug = request_params.get("slug")
    slug_for_cache = slug or "preview"

    lang = get_current_locale(current_app)
    cache_key = f"{endpoint}/{lang}/{slug_for_cache}"
    headers = {}

    if auth_required:
        token = authenticate(username, password, base_endpoint)
        headers = {"Authorization": "Bearer {}".format(token)}

    # add 'lang' param explicitly when a slug exists
    if slug:
        request_params["lang"] = lang

    try:
        url = f"https://{base_endpoint}/wp-json/{endpoint}"
        response = requests.get(url, params=request_params, headers=headers, timeout=REQUEST_TIMEOUT)
        parsed = json.loads(response.content)

        # if getting page by slug and "parsed" is empty
        if slug and not parsed:
            # try again, with same slug but new language
            request_params["lang"] = _get_alt_locale(request_params.get("lang"))
            lang_response = requests.get(url, params=request_params, headers=headers, timeout=REQUEST_TIMEOUT)
            lang_parsed = json.loads(lang_response.content)

            # if we get a response for the other language, return a redirect string
            if lang_parsed:
                return f"/set-lang?from=/{slug}"

        if response.status_code == 403:
            raise Unauthorized()

        if response.status_code >= 400 or not parsed:
            # Getting back a 4xx or 5xx status code
            current_app.logger.info(
                f"Error requesting content. URL: {url}, params: {request_params}, status: {response.status_code}, data: {parsed}"
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


def get_content_by_slug_or_redirect(slug_en, slug_fr):
    page_id = ""
    auth_required = False

    response = request_content(f"wp/v2/pages/{page_id}", {"slug": slug_en}, auth_required=auth_required)

    # when response is a string, redirect to the other lang
    if isinstance(response, str):
        return redirect(f"/{slug_fr}", 301)

    # when response is a dict, display the content
    elif response:
        title = response["title"]["rendered"]
        slug = response["slug_en"]
        html_content = response["content"]["rendered"]

        nav_items = get_nav_items()
        set_active_nav_item(nav_items, request.path)

        return render_template(
            "views/page-content.html",
            title=title,
            html_content=html_content,
            nav_items=nav_items,
            slug=slug,
            lang_url=get_lang_url(response, bool(page_id)),
            stats=get_latest_stats(get_current_locale(current_app)) if slug == "home" else None,
        )
    else:
        abort(404)


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
