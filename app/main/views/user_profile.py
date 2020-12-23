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
from notifications_utils.url_safe_token import check_token

from app import user_api_client
from app.main import main
from app.main.forms import (
    ChangeEmailForm,
    ChangeMobileNumberForm,
    ChangeNameForm,
    ChangePasswordForm,
    ConfirmPasswordForm,
    SecurityKeyForm,
    ServiceOnOffSettingForm,
    TwoFactorForm,
)
from app.models.user import User
from app.utils import user_is_gov_user, user_is_logged_in

NEW_EMAIL = 'new-email'
NEW_MOBILE = 'new-mob'
NEW_MOBILE_PASSWORD_CONFIRMED = 'new-mob-password-confirmed'


@main.route("/user-profile")
@user_is_logged_in
def user_profile():
    num_keys = len(current_user.security_keys)
    return render_template(
        'views/user-profile.html',
        num_keys=num_keys,
        can_see_edit=current_user.is_gov_user,
    )


@main.route("/user-profile/name", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_name():

    form = ChangeNameForm(new_name=current_user.name)

    if form.validate_on_submit():
        current_user.update(name=form.new_name.data)
        return redirect(url_for('.user_profile'))

    return render_template(
        'views/user-profile/change.html',
        thing=_('name'),
        form_field=form.new_name
    )


@main.route("/user-profile/email", methods=['GET', 'POST'])
@user_is_logged_in
@user_is_gov_user
def user_profile_email():

    form = ChangeEmailForm(User.already_registered,
                           email_address=current_user.email_address)

    if form.validate_on_submit():
        session[NEW_EMAIL] = form.email_address.data
        return redirect(url_for('.user_profile_email_authenticate'))
    return render_template(
        'views/user-profile/change.html',
        thing=_('email address'),
        form_field=form.email_address
    )


@main.route("/user-profile/email/authenticate", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_email_authenticate():
    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)
    form = ConfirmPasswordForm(_check_password)

    if NEW_EMAIL not in session:
        return redirect('main.user_profile_email')

    if form.validate_on_submit():
        user_api_client.send_change_email_verification(current_user.id, session[NEW_EMAIL])
        return render_template('views/change-email-continue.html',
                               new_email=session[NEW_EMAIL])

    return render_template(
        'views/user-profile/authenticate.html',
        thing=_('email address'),
        form=form,
        back_link=url_for('.user_profile_email')
    )


@main.route("/user-profile/email/confirm/<token>", methods=['GET'])
@user_is_logged_in
def user_profile_email_confirm(token):
    token_data = check_token(token,
                             current_app.config['SECRET_KEY'],
                             current_app.config['DANGEROUS_SALT'],
                             current_app.config['EMAIL_EXPIRY_SECONDS'])
    token_data = json.loads(token_data)
    user = User.from_id(token_data['user_id'])
    user.update(email_address=token_data['email'])
    session.pop(NEW_EMAIL, None)

    return redirect(url_for('.user_profile'))


@main.route("/user-profile/mobile-number", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_mobile_number():

    form = ChangeMobileNumberForm(mobile_number=current_user.mobile_number)

    if form.validate_on_submit():
        session[NEW_MOBILE] = form.mobile_number.data
        return redirect(url_for('.user_profile_mobile_number_authenticate'))

    return render_template(
        'views/user-profile/change.html',
        thing=_('mobile number'),
        form_field=form.mobile_number
    )


@main.route("/user-profile/mobile-number/authenticate", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_mobile_number_authenticate():

    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)
    form = ConfirmPasswordForm(_check_password)

    if NEW_MOBILE not in session:
        return redirect(url_for('.user_profile_mobile_number'))

    if form.validate_on_submit():
        session[NEW_MOBILE_PASSWORD_CONFIRMED] = True
        current_user.send_verify_code(to=session[NEW_MOBILE])
        return redirect(url_for('.user_profile_mobile_number_confirm'))

    return render_template(
        'views/user-profile/authenticate.html',
        thing=_('mobile number'),
        form=form,
        back_link=url_for('.user_profile_mobile_number_confirm')
    )


@main.route("/user-profile/mobile-number/confirm", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_mobile_number_confirm():

    # Validate verify code for form
    def _check_code(cde):
        return user_api_client.check_verify_code(current_user.id, cde, 'sms')

    if NEW_MOBILE_PASSWORD_CONFIRMED not in session:
        return redirect(url_for('.user_profile_mobile_number'))

    form = TwoFactorForm(_check_code)

    if form.validate_on_submit():
        current_user.refresh_session_id()
        mobile_number = session[NEW_MOBILE]
        del session[NEW_MOBILE]
        del session[NEW_MOBILE_PASSWORD_CONFIRMED]
        current_user.update(mobile_number=mobile_number)
        return redirect(url_for('.user_profile'))

    return render_template(
        'views/user-profile/confirm.html',
        form_field=form.two_factor_code,
        thing=_('mobile number')
    )


@main.route("/user-profile/password", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_password():

    # Validate password for form
    def _check_password(pwd):
        return user_api_client.verify_password(current_user.id, pwd)
    form = ChangePasswordForm(_check_password)

    if form.validate_on_submit():
        user_api_client.update_password(current_user.id, password=form.new_password.data)
        return redirect(url_for('.user_profile'))

    return render_template(
        'views/user-profile/change-password.html',
        form=form
    )


@main.route("/user-profile/security_keys", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_security_keys():
    return render_template('views/user-profile/security-keys.html')


@main.route("/user-profile/security_keys/<keyid>", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_security_keys_confirm_delete(keyid):
    if request.method == 'POST':
        try:
            user_api_client.delete_security_key_user(current_user.id, key=keyid)
            msg = _("Key deleted")
            flash(msg, 'default_with_tick')
            return redirect(url_for('.user_profile_security_keys'))
        except HTTPError as e:
            msg = "Something didn't work properly"
            if e.status_code == 400 and msg in e.message:
                flash(msg, 'info')
                return redirect(url_for('.user_profile_security_keys'))
            else:
                abort(500, e)

    flash(_('Are you sure you want to remove security key {}?').format(keyid), 'remove')
    return render_template(
        'views/user-profile/security-keys.html'
    )


@main.route("/user-profile/security_keys/add", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_add_security_keys():
    form = SecurityKeyForm()

    if(form.keyname.data == ""):
        form.validate_on_submit()
    elif request.method == 'POST':
        result = user_api_client.register_security_key(current_user.id)
        return base64.b64decode(result["data"])

    return render_template(
        'views/user-profile/add-security-keys.html',
        form=form
    )


@main.route("/user-profile/security_keys/complete", methods=['POST'])
@user_is_logged_in
def user_profile_complete_security_keys():
    data = request.get_data()
    payload = base64.b64encode(data).decode("utf-8")
    resp = user_api_client.add_security_key_user(current_user.id, payload)
    return resp['id']


@main.route("/user-profile/security_keys/authenticate", methods=['POST'])
def user_profile_authenticate_security_keys():
    if(session.get('user_details')):
        user_id = session['user_details']['id']
    else:
        user_id = current_user.id
    result = user_api_client.authenticate_security_keys(user_id)
    return base64.b64decode(result["data"])


@main.route("/user-profile/security_keys/validate", methods=['POST'])
def user_profile_validate_security_keys():
    data = request.get_data()
    payload = base64.b64encode(data).decode("utf-8")

    if(session.get('user_details')):
        user_id = session['user_details']['id']
    else:
        user_id = current_user.id

    resp = user_api_client.validate_security_keys(user_id, payload)
    user = User.from_id(user_id)

    # the user will have a new current_session_id set by the API - store it in the cookie for future requests
    session['current_session_id'] = user.current_session_id
    user.login()

    return resp["status"]


@main.route("/user-profile/disable-platform-admin-view", methods=['GET', 'POST'])
@user_is_logged_in
def user_profile_disable_platform_admin_view():
    if not current_user.platform_admin and not session.get('disable_platform_admin_view'):
        abort(403)

    form = ServiceOnOffSettingForm(
        name="Signing in again clears this setting",
        enabled=not session.get('disable_platform_admin_view'),
        truthy='Yes',
        falsey='No',
    )

    if form.validate_on_submit():
        session['disable_platform_admin_view'] = not form.enabled.data
        return redirect(url_for('.user_profile'))

    return render_template(
        'views/user-profile/disable-platform-admin-view.html',
        form=form
    )
