import json
from contextlib import suppress
from datetime import timedelta
from functools import wraps
from inspect import signature

from app.extensions import redis_client

TTL = int(timedelta(days=7).total_seconds())


def _get_argument(argument_name, client_method, args, kwargs):
    with suppress(KeyError):
        return kwargs[argument_name]

    with suppress(ValueError, IndexError):
        argument_index = list(signature(client_method).parameters).index(argument_name)
        return args[argument_index - 1]  # -1 because `args` doesn’t include `self`

    with suppress(KeyError):
        return signature(client_method).parameters[argument_name].default

    raise TypeError("{}() takes no argument called '{}'".format(client_method.__name__, argument_name))


def _make_key(key_format, client_method, args, kwargs):
    return key_format.format(
        **{
            argument_name: _get_argument(argument_name, client_method, args, kwargs)
            for argument_name in list(signature(client_method).parameters)
        }
    )


def set_service_template(key_format):
    def _set(client_method):
        @wraps(client_method)
        def new_client_method(client_instance, *args, **kwargs):
            """
            This decorator is functionaly the same as the `set` decorator. The only difference is that it checks if the
            category of the service template is dirty and updates it if it is. When a category is updated via the admin
            UI, the category is updated in the cache. However, the service template is not updated in the cache. This
            decorator checks the category on the template against the cached category and updates the template if it is
            dirty
            """
            redis_key = _make_key(key_format, client_method, args, kwargs)
            cached_template = redis_client.get(redis_key)

            if cached_template:
                template_category = json.loads(cached_template.decode("utf-8")).get("template_category")
                cached_category = redis_client.get(f"template_category-{template_category['id']}") if template_category else None

                if cached_category:
                    category = json.loads(cached_category.decode("utf-8"))

                    if not category == template_category:
                        redis_client.set(redis_key, json.dumps(cached_category), ex=TTL)

                return json.loads(cached_template.decode("utf-8"))

            api_response = client_method(client_instance, *args, **kwargs)

            redis_client.set(
                redis_key,
                json.dumps(api_response),
                ex=TTL,
            )
            return api_response

        return new_client_method

    return _set


def set(key_format):
    def _set(client_method):
        @wraps(client_method)
        def new_client_method(client_instance, *args, **kwargs):
            redis_key = _make_key(key_format, client_method, args, kwargs)
            cached = redis_client.get(redis_key)
            if cached:
                return json.loads(cached.decode("utf-8"))
            api_response = client_method(client_instance, *args, **kwargs)
            redis_client.set(
                redis_key,
                json.dumps(api_response),
                ex=TTL,
            )
            return api_response

        return new_client_method

    return _set


def delete(key_format):
    def _delete(client_method):
        @wraps(client_method)
        def new_client_method(client_instance, *args, **kwargs):
            try:
                api_response = client_method(client_instance, *args, **kwargs)
            finally:
                redis_key = _make_key(key_format, client_method, args, kwargs)
                redis_client.delete(redis_key)
            return api_response

        return new_client_method

    return _delete


def delete_by_pattern(pattern):
    def _delete_by_pattern(client_method):
        @wraps(client_method)
        def new_client_method(client_instance, *args, **kwargs):
            try:
                api_response = client_method(client_instance, *args, **kwargs)
            finally:
                redis_client.delete_cache_keys_by_pattern(pattern)
            return api_response

        return new_client_method

    return _delete_by_pattern
