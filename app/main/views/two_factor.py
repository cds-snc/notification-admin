from flask import redirect, render_template, request, session, url_for
from flask_babel import _
from flask_login import current_user
from user_agents import parse

from app import user_api_client
from app.main import main
from app.main.forms import TwoFactorForm
from app.main.views.authenticator import Authenticator
from app.models.user import User
from app.utils import is_safe_redirect_url, redirect_to_sign_in


@main.route("/two-factor-email-sent", methods=["GET", "POST"])
@redirect_to_sign_in
def two_factor_email_sent():
    if current_user.is_authenticated:
        return redirect_when_logged_in(user=current_user, platform_admin=current_user.platform_admin)

    user_id = session["user_details"]["id"]

    # Check if a FIDO2 key exists, if yes, return template
    user = User.from_id(user_id)

    if len(user.security_keys):
        return render_template("views/two-factor-fido.html")

    def _check_code(code):
        return user_api_client.check_verify_code(user_id, code, "email")

    form = TwoFactorForm(_check_code)

    if form.validate_on_submit():
        return log_in_user(user_id)

    title = _("Email re-sent") if request.args.get("email_resent") else _("Check your email")
    return render_template(
        "views/two-factor-email.html",
        title=title,
        form=form,
        requires_email_login=request.args.get("requires_email_login", False),
    )


@main.route("/two-factor-sms-sent", methods=["GET", "POST"])
@redirect_to_sign_in
def two_factor_sms_sent():
    if current_user.is_authenticated:
        return redirect_when_logged_in(user=current_user, platform_admin=current_user.platform_admin)

    user_id = session["user_details"]["id"]

    # Check if a FIDO2 key exists, if yes, return template
    user = User.from_id(user_id)

    if len(user.security_keys):
        return render_template("views/two-factor-fido.html")

    def _check_code(code):
        return user_api_client.check_verify_code(user_id, code, "sms")

    form = TwoFactorForm(_check_code)

    if form.validate_on_submit():
        return log_in_user(user_id)

    return render_template("views/two-factor-sms.html", form=form)


def log_in_user(user_id):
    with Authenticator(user_id) as user:
        return redirect_when_logged_in(user=user, platform_admin=user.platform_admin)


def redirect_when_logged_in(user, platform_admin):
    next_url = request.args.get("next")
    if next_url and is_safe_redirect_url(next_url):
        url = next_url
    elif platform_admin:
        url = url_for("main.choose_account")
    else:
        url = url_for("main.show_accounts_or_dashboard")

    if len(user.login_events) > 1:

        def parse_ua(ua):
            user_agent = parse(ua)
            return str(user_agent)

        return render_template(
            "views/login_events.html",
            events=user.login_events,
            next=url,
            parse_ua=parse_ua,
        )

    return redirect(url)
