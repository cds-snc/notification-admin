from flask import current_app, url_for

from app.articles import get_current_locale

GC_ARTICLES_ROUTES = {
    "home": {"en": "/home", "fr": "/acceuil"},
    "whynotify": {"en": "/why-gc-notify", "fr": "/pourquoi-gc-notification"},
    "features": {"en": "/features", "fr": "/fonctionnalites"},
    "guidance": {"en": "/guidance", "fr": "/guides-reference"},
    "security": {"en": "/security", "fr": "/securite"},
    "privacy": {"en": "/privacy", "fr": "/confidentialite"},
    "accessibility": {"en": "/accessibility", "fr": "/accessibilite"},
    "terms": {"en": "/terms", "fr": "/conditions-dutilisation"},
    "personalisation_guide": {"en": "/personalisation-guide", "fr": "/guide-personnalisation"},
    "message_delivery_status": {"en": "/message-delivery-status", "fr": "/etat-livraison-messages"},
    "formatting_guide": {"en": "/formatting-guide", "fr": "/guide-mise-en-forme"},
}


def gca_url_for(route: str, _external: bool = False):
    """
    Returns a URL based on route name

    route: str
        Route to return the URL for.  Must be a valid entry of `GC_ARTICLES_ROUTES`

    _external: bool
        If true, an absolute URL will be returned
        If false (default), a relative URL will be returned

    Return:
        -------
        str
    """

    if route not in GC_ARTICLES_ROUTES:
        raise Exception("GCA Route does not exist")

    prefix = ""
    if _external:
        # build an absolute URL
        prefix = url_for("main.index", _external=True).rstrip("/")

    return prefix + GC_ARTICLES_ROUTES[route][get_current_locale(current_app)]
