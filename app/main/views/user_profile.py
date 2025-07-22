import base64
import json

from flask import (
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_babel import _
from flask_login import current_user
from notifications_python_client.errors import HTTPError
from notifications_utils.decorators import requires_feature
from notifications_utils.url_safe_token import check_token

from app import user_api_client
from app.main import main
from app.main.forms import (
    AuthMethodForm,
    ChangeEmailForm,
    ChangeMobileNumberFormOptional,
    ChangeNameForm,
    ChangePasswordForm,
    ConfirmPasswordForm,
    SecurityKeyForm,
    ServiceOnOffSettingForm,
    TwoFactorForm,
)
from app.models.user import User
from app.utils import user_is_gov_user, user_is_logged_in

# Session keys
NEW_EMAIL = "new-email"
NEW_MOBILE = "new-mob"
NEW_MOBILE_PASSWORD_CONFIRMED = "new-mob-password-confirmed"
SEND_PAGE_CONTEXT_FLAGS = ["from_send_page", "send_page_service_id", "send_page_template_id"]
HAS_AUTHENTICATED = "has_authenticated"


@main.route("/user-profile")
@user_is_logged_in
def user_profile():
    # Clear any flags that were set for the send page
    for flag in SEND_PAGE_CONTEXT_FLAGS:
        session.pop(flag, None)

    # revoke their additional authentication when they return to this page
    session.pop(HAS_AUTHENTICATED, None)

    num_keys = len(current_user.security_keys)
    return render_template(
        "views/user-profile.html",
        num_keys=num_keys,
        can_see_edit=current_user.is_gov_user,
    )


@main.route("/user-profile/name", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_name():
    form = ChangeNameForm(new_name=current_user.name)

    if form.validate_on_submit():
        current_user.update(name=form.new_name.data)
        return redirect(url_for(".user_profile"))

    return render_template("views/user-profile/change.html", thing=_("name"), form_field=form.new_name)


@main.route("/user-profile/email", methods=["GET", "POST"])
@user_is_logged_in
@user_is_gov_user
def user_profile_email():
    form = ChangeEmailForm(User.already_registered, email_address=current_user.email_address)

    if form.validate_on_submit():
        session[NEW_EMAIL] = form.email_address.data
        return redirect(url_for(".user_profile_email_authenticate"))
    return render_template(
        "views/user-profile/change.html",
        thing=_("email address"),
        form_field=form.email_address,
    )


@main.route("/user-profile/email/authenticate", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_email_authenticate():
    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)

    form = ConfirmPasswordForm(_check_password)

    if NEW_EMAIL not in session:
        return redirect("main.user_profile_email")

    if form.validate_on_submit():
        user_api_client.send_change_email_verification(current_user.id, session[NEW_EMAIL])
        return render_template("views/change-email-continue.html", new_email=session[NEW_EMAIL])

    return render_template(
        "views/user-profile/authenticate.html",
        thing=_("email address"),
        form=form,
        back_link=url_for(".user_profile_email"),
    )


@main.route("/user-profile/email/confirm/<token>", methods=["GET"])
@user_is_logged_in
def user_profile_email_confirm(token):
    token_data = check_token(
        token=token,
        secret=current_app.config["SECRET_KEY"],
        max_age_seconds=current_app.config["EMAIL_EXPIRY_SECONDS"],
    )
    token_data = json.loads(token_data)
    user = User.from_id(token_data["user_id"])
    user.update(email_address=token_data["email"])
    session.pop(NEW_EMAIL, None)

    return redirect(url_for(".user_profile"))


@main.route("/user-profile/mobile-number", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_mobile_number():
    from_send_page = False

    form = ChangeMobileNumberFormOptional(mobile_number=current_user.mobile_number)

    # determine if we are coming from the send page
    from_send_page = session.get("from_send_page", False)
    session["from_send_page"] = request.args.get("from_send_page") if not from_send_page == "user_profile_2fa" else from_send_page
    session["send_page_service_id"] = request.args.get("service_id")
    session["send_page_template_id"] = request.args.get("template_id")

    if request.method == "POST":
        # get button presses
        edit_or_cancel_pressed = request.form.get("button_pressed")
        remove_pressed = request.form.get("remove")

        # if they are posting the button "edit"
        if edit_or_cancel_pressed == "edit":
            current_user.update(verified_phonenumber=False)
            if current_user.auth_type == "sms_auth":
                current_user.update(auth_type="email_auth")
            return render_template(
                "views/user-profile/change.html",
                thing=_("mobile number"),
                form_field=form.mobile_number,
            )

        elif remove_pressed == "remove":
            session[NEW_MOBILE] = ""
            return redirect(url_for(".user_profile_mobile_number_authenticate"))

        elif edit_or_cancel_pressed == "cancel":
            return redirect(url_for(".user_profile"))

        elif form.validate_on_submit():
            # If the mobile number is empty or None, treat it as a removal request
            if not form.mobile_number.data or form.mobile_number.data.strip() == "":
                session[NEW_MOBILE] = ""
                return redirect(url_for(".user_profile_mobile_number_authenticate"))

            current_user.update(mobile_number=form.mobile_number.data)
            flash(_("Mobile number {} saved to your profile").format(form.mobile_number.data), "default_with_tick")

            if from_send_page == "send_test":
                return redirect(url_for(".verify_mobile_number"))
            elif session.get(HAS_AUTHENTICATED) and from_send_page == "user_profile_2fa":
                return redirect(url_for(".verify_mobile_number"))
            return redirect(url_for(".user_profile"))

        else:
            return render_template(
                "views/user-profile/change.html",
                thing=_("mobile number"),
                form_field=form.mobile_number,
            )
    else:
        # if they dont have a number set, just go right to the edit page
        if current_user.mobile_number is None:
            current_user.update(mobile_number=None, verified_phonenumber=False)
            if current_user.auth_type == "sms_auth":
                current_user.update(auth_type="email_auth")
            return render_template(
                "views/user-profile/change.html",
                thing=_("mobile number"),
                form_field=form.mobile_number,
                from_send_page=from_send_page,
            )

    if from_send_page == "user_profile_2fa":
        return redirect(url_for(".verify_mobile_number"))

    return render_template(
        "views/user-profile/manage-phones.html",
        thing=_("mobile number"),
        form_field=form.mobile_number,
    )


@main.route("/user-profile/mobile-number/authenticate", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_mobile_number_authenticate():
    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)

    form = ConfirmPasswordForm(_check_password)
    if NEW_MOBILE not in session:
        return redirect(url_for(".user_profile_mobile_number"))

    if form.validate_on_submit():
        # if they are removing their phone number, skip verification, set auth type to email, and remove verified phone number flag
        if not session[NEW_MOBILE]:
            current_user.update(mobile_number=None, auth_type="email_auth")
            current_user.update(verified_phonenumber=False)

            flash(_("Mobile number removed from your profile"), "default_with_tick")
            return redirect(url_for(".user_profile"))

        session[NEW_MOBILE_PASSWORD_CONFIRMED] = True
        current_user.send_verify_code(to=session[NEW_MOBILE])
        return redirect(url_for(".user_profile_mobile_number_confirm"))

    return render_template(
        "views/user-profile/authenticate.html",
        thing=_("mobile number"),
        form=form,
        back_link=url_for(".user_profile_mobile_number_confirm"),
        remove=True if session[NEW_MOBILE] == "" else False,
    )


@main.route("/user-profile/mobile-number/confirm", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_mobile_number_confirm():
    # Validate verify code for form
    def _check_code(code):
        return user_api_client.validate_2fa_method(current_user.id, code, "sms")

    if NEW_MOBILE_PASSWORD_CONFIRMED not in session:
        return redirect(url_for(".user_profile_mobile_number"))

    form = TwoFactorForm(_check_code)

    if form.validate_on_submit():
        current_user.refresh_session_id()
        mobile_number = session[NEW_MOBILE]
        del session[NEW_MOBILE]
        del session[NEW_MOBILE_PASSWORD_CONFIRMED]
        current_user.update(mobile_number=mobile_number)
        current_user.update(verified_phonenumber=True)

        flash(_("Mobile number {} saved to your profile").format(mobile_number), "default_with_tick")

        # Check if we are coming from the send page, do cleanup
        from_send_page = session.pop("from_send_page", False)
        service_id = session.pop("send_page_service_id", None)
        template_id = session.pop("send_page_template_id", None)

        # Redirect based on where the user came from
        if from_send_page:
            # Redirect back to the send test page we need to verify the phone number first
            if from_send_page == "send_test" and service_id and template_id:
                return redirect(url_for(".verify_mobile_number", service_id=service_id, template_id=template_id))
            if from_send_page == "user_profile_2fa":
                # Redirect back to the 2FA page if they were setting up 2FA
                return redirect(url_for(".user_profile_2fa"))

        else:
            # Default redirect to user profile
            return redirect(url_for(".user_profile"))

    return render_template("views/user-profile/confirm.html", form=form, back_link=url_for(".user_profile_mobile_number"))


@main.route("/user-profile/mobile-number/resend", methods=["GET", "POST"])
@user_is_logged_in
def sms_not_received():
    current_user.send_verify_code(to=session[NEW_MOBILE])
    flash(_("Verification code re-sent"), "default_with_tick")
    return redirect(url_for(".verify_mobile_number"))


@main.route("/user-profile/password", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_password():
    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)

    form = ChangePasswordForm(_check_password)

    if form.validate_on_submit():
        user_api_client.update_password(current_user.id, password=form.new_password.data)
        return redirect(url_for(".user_profile"))

    return render_template("views/user-profile/change-password.html", form=form)


@main.route("/user-profile/security_keys", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_security_keys():
    from_send_page = session.get("from_send_page", False)
    if from_send_page == "user_profile_2fa":
        return redirect(url_for(".user_profile_2fa"))
        # If we are coming from the send page, we need to clear the session flags
    return render_template("views/user-profile/security-keys.html")


@main.route("/user-profile/security_keys/<keyid>", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_security_keys_confirm_delete(keyid):
    if request.method == "POST":
        try:
            user_api_client.delete_security_key_user(current_user.id, key=keyid)
            msg = _("Key removed")
            flash(msg, "default_with_tick")
            return redirect(url_for(".user_profile_security_keys"))
        except HTTPError as e:
            msg = "Something didn't work properly"
            if e.status_code == 400 and msg in e.message:
                flash(msg, "info")
                return redirect(url_for(".user_profile_security_keys"))
            else:
                abort(500, e)

    flash(_("Are you sure you want to remove security key {}?").format(keyid), "remove")
    return render_template("views/user-profile/security-keys.html")


@main.route("/user-profile/security_keys/add", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_add_security_keys():
    form = SecurityKeyForm()

    if form.keyname.data == "":
        form.validate_on_submit()
    elif request.method == "POST":
        result = user_api_client.register_security_key(current_user.id)
        return base64.b64decode(result["data"])

    return render_template("views/user-profile/add-security-keys.html", form=form)


@main.route("/user-profile/security_keys/complete", methods=["POST"])
@user_is_logged_in
def user_profile_complete_security_keys():
    data = request.get_data()
    payload = base64.b64encode(data).decode("utf-8")
    resp = user_api_client.add_security_key_user(current_user.id, payload)
    return resp["id"]


@main.route("/user-profile/security_keys/authenticate", methods=["POST"])
def user_profile_authenticate_security_keys():
    if session.get("user_details"):
        user_id = session["user_details"]["id"]
    else:
        user_id = current_user.id
    result = user_api_client.authenticate_security_keys(user_id)
    return base64.b64decode(result["data"])


@main.route("/user-profile/security_keys/validate", methods=["POST"])
def user_profile_validate_security_keys():
    data = request.get_data()
    payload = base64.b64encode(data).decode("utf-8")

    if session.get("user_details"):
        user_id = session["user_details"]["id"]
    else:
        user_id = current_user.id

    resp = user_api_client.validate_security_keys(user_id, payload)
    user = User.from_id(user_id)

    if "password" in session.get("user_details", {}):
        user.update_password(session["user_details"]["password"])

    # the user will have a new current_session_id set by the API - store it in the cookie for future requests
    session["current_session_id"] = user.current_session_id
    user.login()

    return resp["status"]


@main.route("/user-profile/disable-platform-admin-view", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_disable_platform_admin_view():
    if not current_user.platform_admin and not session.get("disable_platform_admin_view"):
        abort(403)

    form = ServiceOnOffSettingForm(
        name=_("Signing in again clears this setting"),
        enabled=not session.get("disable_platform_admin_view"),
        truthy=_("Yes"),
        falsey=_("No"),
    )

    if form.validate_on_submit():
        session["disable_platform_admin_view"] = not form.enabled.data
        return redirect(url_for(".user_profile"))

    return render_template("views/user-profile/disable-platform-admin-view.html", form=form)


@main.route("/user-profile/verify-mobile-number", methods=["GET", "POST"])
@user_is_logged_in
@requires_feature("FF_AUTH_V2")
def verify_mobile_number():
    """
    This route is used to verify the user's mobile number.
    It sends a verification code to the user's mobile number and
    allows them to confirm it.

    """
    # Depending on the workflow, if we are coming from the "send_test" page there are two options:
    # 1. We might come to this func from adding a phone number, and the below data will be stored in session
    # 2. If we come to this func because the phone number is not validated, the data will be stored in request
    from_send_page = session.get("from_send_page", False) or request.args.get("from_send_page")
    send_page_service_id = session.get("send_page_service_id") or request.args.get("service_id")
    send_page_template_id = session.get("send_page_template_id") or request.args.get("template_id")

    if not current_user.mobile_number and NEW_MOBILE_PASSWORD_CONFIRMED not in session:
        return redirect(url_for(".user_profile_2fa"))

    # Validate password for form
    def _check_code(code):
        return user_api_client.validate_2fa_method(current_user.id, code, "sms")

    form = TwoFactorForm(_check_code)

    if form.validate_on_submit():
        current_user.update(verified_phonenumber=True)
        if from_send_page == "send_test":
            return redirect(url_for(".send_test", service_id=send_page_service_id, template_id=send_page_template_id))
        current_user.update(auth_type="sms_auth")
        flash(_("Two-step verification method updated"), "default_with_tick")
        return redirect(url_for(".user_profile_2fa"))
    else:
        current_user.send_verify_code(to=current_user.mobile_number)

    return render_template(
        "views/user-profile/confirm.html",
        form=form,
        back_link=url_for(".user_profile_2fa")
        if NEW_MOBILE_PASSWORD_CONFIRMED not in session
        else url_for(".user_profile_mobile_number"),
    )


@main.route("/user-profile/2fa", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_2fa():
    # TODO: This should be gated behind a new route that confirms the users password before allowing them to make changes
    if current_app.config["FF_AUTH_V2"]:
        # IF they have not authenticated yet, do it now
        if not session.get(HAS_AUTHENTICATED):
            return redirect(url_for(".user_profile_2fa_authenticate"))
        data = [("email", _("Receive a code by email")), ("sms", _("Receive a code by text message"))]
        if getattr(current_user, "security_keys", None) and current_user.security_keys != []:
            if len(current_user.security_keys) > 1:
                data.extend([("security_key", _("Use existing security keys"))])
            else:
                data.extend([("security_key", _("Use existing security key"))])
        data.append(("new_key", _("Add a new security key")))
        hints = {
            "email": current_user.email_address,
            "sms": current_user.mobile_number
            if current_user.mobile_number
            else _("Add a mobile number to your profile to use this option."),
            "new_key": _(
                "Enhance your account’s security by adding a security key such as a government issued Yubi key. Follow prompts to add the key."
            ),
        }
        badge_options = {
            "email": [_("Verified"), "success"],
            "sms": None
            if current_user.mobile_number is None
            else [_("Not verified"), "default"]
            if not current_user.verified_phonenumber
            else [_("Verified"), "success"],
            "new_key": None,
        }

        if current_user.auth_type == "email_auth":
            current_auth_method = "email"
        elif current_user.auth_type == "sms_auth":
            current_auth_method = "sms"
        else:
            # todo: add a case for security keys
            current_auth_method = "email"
        form = AuthMethodForm(all_auth_methods=data, current_auth_method=current_auth_method)

        if request.method == "POST" and form.validate_on_submit():
            # Update user's auth type based on selected 2FA method
            new_auth_type = form.auth_method.data
            if new_auth_type == "email":
                auth_type = "email_auth"
            elif new_auth_type == "sms":
                auth_type = "sms_auth"

                if not current_user.mobile_number:
                    session["from_send_page"] = "user_profile_2fa"
                    return redirect(url_for(".user_profile_mobile_number"))
                elif not current_user.verified_phonenumber:
                    return redirect(url_for(".verify_mobile_number"))
            elif new_auth_type == "new_key":
                # Redirect to add a new security key
                session["from_send_page"] = "user_profile_2fa"
                return redirect(url_for(".user_profile_add_security_keys"))
            # todo: add a case for existing security keys
            else:
                # Default to email auth if something unexpected is selected
                auth_type = "email_auth"

            # Flash a success message
            flash(_("Two-step verification method updated"), "default_with_tick")
            # Update the user's auth type
            current_user.update(auth_type=auth_type)

            # Redirect back to user profile and revoke their additional authentication
            session.pop(HAS_AUTHENTICATED, None)
            return redirect(url_for(".user_profile"))

        return render_template("views/user-profile/2fa.html", form=form, hints=hints, badge_options=badge_options)
    return redirect(url_for(".user_profile"))


@main.route("/user-profile/2fa/authenticate", methods=["GET", "POST"])
@user_is_logged_in
def user_profile_2fa_authenticate():
    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)

    form = ConfirmPasswordForm(_check_password)

    if form.validate_on_submit():
        session[HAS_AUTHENTICATED] = True
        return redirect(url_for(".user_profile_2fa"))

    return render_template(
        "views/user-profile/authenticate.html",
        thing=_("email address"),
        form=form,
        back_link=url_for(".user_profile"),
    )
