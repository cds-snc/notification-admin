from urllib.parse import urlparse, urlunparse

from flask import current_app, redirect, request, session, url_for

from app.main import main
from app.utils import is_safe_redirect_url


@main.route("/set-lang")
def set_lang():
    requestLang = request.accept_languages.best_match(current_app.config["LANGUAGES"])
    lang = session.get("userlang", requestLang)

    if lang == "en":
        session["userlang"] = "fr"
    else:
        session["userlang"] = "en"

    if is_safe_redirect_url(request.args.get("from", "/")):
        url = request.args.get("from", "/")
    else:
        # redirect to main page in case of an invalid redirect
        url = url_for("main.show_accounts_or_dashboard")

    # remove non-printable characters from url
    url = "".join(ch for ch in url if ch.isprintable())

    # Parse the URL to handle query strings properly
    parsed = urlparse(url)
    path = parsed.path

    # Swap /en/ and /fr/ in the path if present
    if path.startswith("/en/"):
        path = "/fr/" + path[4:]
    elif path.startswith("/fr/"):
        path = "/en/" + path[4:]

    # Reconstruct URL with original query string preserved
    url = urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, parsed.query, parsed.fragment))

    return redirect(url)
