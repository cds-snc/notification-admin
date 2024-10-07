from flask import request, session
from flask_login import current_user

from app.articles.routing import GC_ARTICLES_ROUTES

TERMS_KEY = "terms_agreed"
EVENTS_KEY = "login_events"


def show_tou_prompt():
    """Determine whether or not the TOU prompt should be shown.

    The TOU prompt should be displayed if the user is authenticated, has not already agreed to the terms, and is not on the contact page or a GCA route.
    """
    is_gca_route = False

    for route in GC_ARTICLES_ROUTES.values():
        if request.path == route["en"] or request.path == route["fr"]:
            is_gca_route = True
            break

    if current_user.is_authenticated and not session.get(TERMS_KEY) and "/contact" not in request.url and not is_gca_route:
        return True

    return False


def accept_terms():
    session[TERMS_KEY] = True
    session.pop(EVENTS_KEY, None)
