import json
from datetime import datetime

from flask import current_app, flash, redirect, render_template, session, url_for
from flask_babel import _
from itsdangerous import SignatureExpired, URLSafeTimedSerializer

from notifications_utils.url_safe_token import check_token

from app.main import main
from app.main.forms import NewPasswordForm
from app.main.views.two_factor import log_in_user
from app.models.user import User


@main.route("/new-password/<path:token>", methods=["GET", "POST"])
def new_password(token):
    try:
        token_data_no_checks = URLSafeTimedSerializer("").loads_unsafe(token)[1]
        token_data = check_token(
            token,
            current_app.config["SECRET_KEY"],
            current_app.config["DANGEROUS_SALT"],
            current_app.config["EMAIL_EXPIRY_SECONDS"],
        )
    except SignatureExpired:
        email_address = json.loads(token_data_no_checks).get("email", "")
        session["email_address"] = email_address
        user = User.from_email_address_or_none("email_address")
        if user and user.password_expired:
            flash(_("The link in the email we sent you has expired"))
        else:
            flash(_("The security code in the email we sent you has expired. Enter your email address to re-send."))

        return redirect(url_for(".forgot_password"))

    email_address = json.loads(token_data)["email"]
    user = User.from_email_address(email_address)
    if user.password_changed_at and datetime.strptime(user.password_changed_at, "%Y-%m-%d %H:%M:%S.%f") > datetime.strptime(
        json.loads(token_data)["created_at"], "%Y-%m-%d %H:%M:%S.%f"
    ):
        flash(_("The security code in the email has already been used"))
        return redirect(url_for("main.index"))

    form = NewPasswordForm()

    if form.validate_on_submit():
        user.reset_failed_login_count()
        session["user_details"] = {
            "id": user.id,
            "email": user.email_address,
            "password": form.new_password.data,
        }
        if user.auth_type == "email_auth":
            # they've just clicked an email link, so have done an email auth journey anyway. Just log them in.
            return log_in_user(user.id)
        else:
            # send user a 2fa sms code
            user.send_verify_code()
            return redirect(url_for("main.two_factor_sms_sent"))
    else:
        return render_template("views/new-password.html", token=token, form=form, user=user)
