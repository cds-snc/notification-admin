from flask import abort, flash, render_template, flash
from flask_babel import _
from notifications_python_client.errors import HTTPError

from app import user_api_client
from app.main import main
from app.main.forms import ForgotPasswordForm


@main.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    form = ForgotPasswordForm()
    if form.validate_on_submit():
        try:
            user_api_client.send_reset_password_url(form.email_address.data)
        except HTTPError as e:
            if e.status_code == 400:
                flash(_("You cannot reset your password as your account has been blocked. Please email us at assistance@cds-snc.ca"))
                abort(400)
            elif e.status_code == 404:
                return render_template('views/password-reset-sent.html')
            else:
                raise e
        return render_template('views/password-reset-sent.html')

    return render_template('views/forgot-password.html', form=form)
