from flask import current_app, url_for

from app.articles import get_current_locale

GC_ARTICLES_ROUTES = {
    "accessibility": {"en": "/accessibility", "fr": "/accessibilite"},
    "features": {"en": "/features", "fr": "/fonctionnalites"},
    "formatting_guide": {"en": "/formatting-guide", "fr": "/guide-mise-en-forme"},
    "guidance": {"en": "/guidance", "fr": "/guides-reference"},
    "home": {"en": "/home", "fr": "/accueil"},
    "message_delivery_status": {"en": "/message-delivery-status", "fr": "/etat-livraison-messages"},
    "other_services": {"en": "/other-services", "fr": "/autres-services"},
    "personalisation_guide": {"en": "/personalisation-guide", "fr": "/guide-personnalisation"},
    "privacy": {"en": "/privacy", "fr": "/confidentialite"},
    "privacy-old": {"en": "/privacy-old", "fr": "/confidentialite-old"},
    "security": {"en": "/security", "fr": "/securite"},
    "security_old": {"en": "/security-old", "fr": "/securite-old"},
    "spreadsheets": {"en": "/spreadsheets", "fr": "/feuille-de-calcul"},
    "terms": {"en": "/terms", "fr": "/conditions-dutilisation"},
    "whynotify": {"en": "/why-gc-notify", "fr": "/pourquoi-gc-notification"},
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
