from datetime import timedelta
from typing import Union

import requests
from flask import abort, current_app, json
from werkzeug.exceptions import NotFound, Unauthorized

from app import get_current_locale
from app.articles import (
    GC_ARTICLES_AUTH_API_ENDPOINT,
    GC_ARTICLES_AUTH_TOKEN_CACHE_KEY,
    GC_ARTICLES_AUTH_TOKEN_CACHE_TTL,
    GC_ARTICLES_FALLBACK_CACHE_PREFIX,
    GC_ARTICLES_FALLBACK_CACHE_TTL,
    REQUEST_TIMEOUT,
)
from app.extensions import redis_client


def get_content(endpoint: str, params={}, auth_required=False, cacheable=True) -> Union[dict, None]:
    base_url = current_app.config["GC_ARTICLES_API"]
    lang = get_current_locale(current_app)

    headers = _get_headers(auth_required)

    try:
        url = f"https://{base_url}/wp-json/{endpoint}"
        response = requests.get(url, params=params, headers=headers, timeout=REQUEST_TIMEOUT)
        parsed = json.loads(response.content)

        if response.status_code == 403:
            raise Unauthorized()

        if response.status_code >= 400 or not parsed:
            # Getting back a 4xx or 5xx status code
            current_app.logger.info(
                f"Error requesting content. URL: {url}, params: {params}, status: {response.status_code}, data: {parsed}"
            )
            raise NotFound()

        # Long-term "Fallback" cache
        if cacheable:
            slug = params.get("slug")
            cache_key = f"{GC_ARTICLES_FALLBACK_CACHE_PREFIX}{endpoint}"
            if slug:
                cache_key += f"/{lang}/{slug}"
            current_app.logger.info(f"Saving to cache: {cache_key}")
            redis_client.set(cache_key, json.dumps(parsed), ex=GC_ARTICLES_FALLBACK_CACHE_TTL)

        return parsed
    except Unauthorized:
        abort(401)
    except requests.exceptions.ConnectionError:  # TODO ???
        # Fallback cache in case we can't connect to GC Articles
        cached = redis_client.get(cache_key)
        if cached is not None:
            current_app.logger.info(f"Cache hit: {cache_key}")
            obj = json.loads(cached)
            if isinstance(obj, list):
                return obj[0]
            return obj

        current_app.logger.info(f"Cache miss: {cache_key}")
        return None
    # except Exception:
    #     return None


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
    if redis_client.get(GC_ARTICLES_AUTH_TOKEN_CACHE_KEY) is not None:
        token = redis_client.get(GC_ARTICLES_AUTH_TOKEN_CACHE_KEY)
        if validate_token(token):
            return token

    try:
        # Otherwise get a fresh one
        res = requests.post(url=url, data={"username": username, "password": password}, timeout=REQUEST_TIMEOUT)

        parsed = json.loads(res.text)

        redis_client.set(GC_ARTICLES_AUTH_TOKEN_CACHE_KEY, parsed["token"], ex=GC_ARTICLES_AUTH_TOKEN_CACHE_TTL)

        return parsed["token"]
    except Exception:
        return None


def _get_headers(auth_required=False):
    base_endpoint = current_app.config["GC_ARTICLES_API"]
    username = current_app.config["GC_ARTICLES_API_AUTH_USERNAME"]
    password = current_app.config["GC_ARTICLES_API_AUTH_PASSWORD"]

    if auth_required:
        token = authenticate(username, password, base_endpoint)
        return {"Authorization": "Bearer {}".format(token)}
    return {}
