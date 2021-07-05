from flask import current_app, redirect, request, session

from app.main import main


@main.route("/set-lang")
def set_lang():
    requestLang = request.accept_languages.best_match(current_app.config["LANGUAGES"])
    lang = session.get("userlang", requestLang)

    if lang == "en":
        session["userlang"] = "fr"
    else:
        session["userlang"] = "en"

    return redirect(request.args.get("from", "/"))
