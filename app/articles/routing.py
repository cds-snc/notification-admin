from flask import current_app, url_for

from app.articles import get_current_locale

GC_ARTICLES_ROUTES = {
    "accessibility": {"en": "/accessibility", "fr": "/accessibilite"},
    "bounce_guidance": {"en": "/updating-contact-information", "fr": "/maintenir-a-jour-les-coordonnees"},
    "features": {"en": "/features", "fr": "/fonctionnalites"},
    "formatting_guide": {"en": "/formatting-emails", "fr": "/guide-mise-en-forme"},
    "guidance": {"en": "/guidance", "fr": "/guides-reference"},
    "home": {"en": "/home", "fr": "/accueil"},
    "message_delivery_status": {"en": "/understanding-delivery-and-failure", "fr": "/comprendre-statut-de-livraison"},
    "other_services": {"en": "/other-services", "fr": "/autres-services"},
    "personalisation_guide": {"en": "/sending-custom-content", "fr": "/envoyer-contenu-personnalise"},
    "privacy": {"en": "/privacy", "fr": "/confidentialite"},
    "privacy-202209": {"en": "/privacy-202209", "fr": "/confidentialite-202209"},
    "privacy_old": {"en": "/privacy-old", "fr": "/confidentialite-old"},
    "security": {"en": "/security", "fr": "/securite"},
    "security-202209": {"en": "/security-202209", "fr": "/securite-202209"},
    "security_old": {"en": "/security-old", "fr": "/securite-old"},
    "service-level-agreement": {"en": "/service-level-agreement", "fr": "/accord-niveaux-de-service"},
    "service-level-agreement-202210": {"en": "/service-level-agreement-202210", "fr": "/accord-niveaux-de-service-202210"},
    "service-level-objectives": {"en": "/service-level-objectives", "fr": "/objectifs-niveau-de-service"},
    "spreadsheets": {"en": "/using-a-spreadsheet", "fr": "/utiliser-une-feuille-de-calcul"},
    "terms-202104": {"en": "/terms-202104", "fr": "/conditions-dutilisation-202104"},
    "terms": {"en": "/terms", "fr": "/conditions-dutilisation"},
    "whynotify": {"en": "/why-gc-notify", "fr": "/pourquoi-notification-gc"},
    "incidents": {"en": "/system-status", "fr": "/etat-du-systeme"},
    "new_features": {"en": "/new-features", "fr": "/nouvelles-fonctionnalites"},
    "register_for_demo": {"en": "/register-for-a-demo", "fr": "/sinscrire-a-une-demo"},
    "getting_started": {"en": "/getting-started", "fr": "/decouvrir-notification-gc"},  
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
