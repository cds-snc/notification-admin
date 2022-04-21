from flask import abort, flash, redirect, render_template, request, session, url_for
from flask_babel import _
from flask_login import current_user

from app import login_manager
from app.main import main
from app.main.forms import LoginForm
from app.models.user import InvitedUser, User
from app.utils import _constructLoginData


@main.route("/sign-in", methods=(["GET", "POST"]))
def sign_in():
    if current_user and current_user.is_authenticated:
        return redirect(url_for("main.show_accounts_or_dashboard"))

    form = LoginForm()

    if form.validate_on_submit():

        login_data = _constructLoginData(request)

        user = User.from_email_address_or_none(form.email_address.data)
        if user and user.password_expired:
            session["reset_email_address"] = user.email_address
            return redirect(url_for("main.forced_password_reset"))

        user = User.from_email_address_and_password_or_none(form.email_address.data, form.password.data, login_data)

        if user and user.locked:
            flash(
                _(
                    "Your account has been locked after {} sign-in attempts. Please email us at assistance+notification@cds-snc.ca"
                ).format(user.max_failed_login_count)
            )
            abort(400)

        if user and user.state == "pending":
            return redirect(url_for("main.resend_email_verification"))

        if user and session.get("invited_user"):
            invited_user = InvitedUser.from_session()
            if user.email_address.lower() != invited_user.email_address.lower():
                flash(_("You cannot accept an invite for another person."))
                session.pop("invited_user", None)
                abort(403)
            else:
                invited_user.accept_invite()
        requires_email_login = user and user.requires_email_login
        if user and user.sign_in():
            if user.sms_auth and not requires_email_login:
                return redirect(url_for(".two_factor_sms_sent", next=request.args.get("next")))
            if user.email_auth or requires_email_login:
                args = {"requires_email_login": True} if requires_email_login else {}
                return redirect(url_for(".two_factor_email_sent", **args))

        # Vague error message for login in case of user not known, inactive or password not verified
        flash(_("The email address or password you entered is incorrect."))

    other_device = current_user.logged_in_elsewhere()
    return render_template(
        "views/signin.html",
        form=form,
        again=bool(request.args.get("next")),
        other_device=other_device,
    )


@login_manager.unauthorized_handler
def sign_in_again():
    return redirect(url_for("main.sign_in", next=request.path))
