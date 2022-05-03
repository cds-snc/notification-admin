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

    return redirect(url)
