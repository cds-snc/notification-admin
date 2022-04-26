from datetime import timedelta

from flask import current_app

from app import get_current_locale

REQUEST_TIMEOUT = 5
GC_ARTICLES_AUTH_API_ENDPOINT = "/wp-json/jwt-auth/v1/token"
GC_ARTICLES_AUTH_TOKEN_CACHE_KEY = "gc-articles-bearer-token"
GC_ARTICLES_AUTH_TOKEN_CACHE_TTL = int(timedelta(days=1).total_seconds())
GC_ARTICLES_FALLBACK_CACHE_PREFIX = "gc-articles-fallback--"
GC_ARTICLES_FALLBACK_CACHE_TTL = int(timedelta(days=7).total_seconds())
GC_ARTICLES_CACHE_PREFIX = "gc-articles--"
GC_ARTICLES_DEFAULT_CACHE_TTL = int(timedelta(days=1).total_seconds())
GC_ARTICLES_NAV_CACHE_TTL = int(timedelta(days=5).total_seconds())


def _get_alt_locale(locale):
    return "fr" if locale == "en" else "en"


def set_active_nav_item(items=[], url="") -> None:
    for item in items:
        item["active"] = True if item["url"] == url else False


def get_lang_url(response: dict, has_page_id: bool) -> str:
    """
    Return URL path for the language switcher
    URL either looks like:
        - /preview?id=11
        - /wild-card
    """
    alt_lang = _get_alt_locale(get_current_locale(current_app))

    if has_page_id:
        if response.get(f"id_{alt_lang}"):
            lang_id = response.get(f"id_{alt_lang}")
            return f"/preview?id={lang_id}"
        else:
            """if no translated page id, return 404 explicitly"""
            return "/404"

    lang_slug = response.get(f"slug_{alt_lang}") or response.get("slug")
    """if no translated page slug, this will 404 by itself"""
    return f"/{lang_slug}"


def get_preview_url(page_id: int) -> str:
    """Return URL for the "Edit this page" link in the preview banner header"""
    lang = get_current_locale(current_app)
    base_endpoint = current_app.config["GC_ARTICLES_API"]

    return f"https://{base_endpoint}/wp-admin/post.php?post={page_id}&action=edit&lang={lang}"
