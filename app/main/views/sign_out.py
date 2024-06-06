from flask import current_app, flash, redirect, session, url_for
from flask_babel import _
from flask_login import logout_user

from app import get_current_locale
from app.main import main


@main.route("/sign-out", methods=(["GET"]))
def sign_out():
    currentlang = get_current_locale(current_app)
    session.clear()
    logout_user()
    session["userlang"] = currentlang

    flash(_("You have been signed out."), "default_with_tick")
    return redirect(url_for("main.sign_in"))
