from flask import flash, redirect, render_template, request, url_for
from flask_babel import _
from flask_login import current_user

from app import user_api_client
from app.event_handlers import create_archive_user_event
from app.main import main
from app.main.forms import SearchUsersByEmailForm
from app.models.user import User
from app.utils import user_is_platform_admin


@main.route("/find-users-by-email", methods=["GET", "POST"])
@user_is_platform_admin
def find_users_by_email():
    form = SearchUsersByEmailForm()
    users_found = None
    if form.validate_on_submit():
        users_found = user_api_client.find_users_by_full_or_partial_email(form.search.data)["data"]
    return render_template("views/find-users/find-users-by-email.html", form=form, users_found=users_found)


@main.route("/users/<user_id>", methods=["GET"])
@user_is_platform_admin
def user_information(user_id):
    return render_template(
        "views/find-users/user-information.html",
        user=User.from_id(user_id),
    )


@main.route("/users/<uuid:user_id>/block", methods=["GET", "POST"])
@user_is_platform_admin
def block_user(user_id):
    if request.method == "POST":
        user = User.from_id(user_id)
        user.update(blocked=True, updated_by=current_user.id)
        return redirect(url_for(".user_information", user_id=user_id))
    else:
        flash([_("Are you sure you want to block this user?")], "block")
        return user_information(user_id)


@main.route("/users/<uuid:user_id>/unblock", methods=["GET", "POST"])
@user_is_platform_admin
def unblock_user(user_id):
    if request.method == "POST":
        user = User.from_id(user_id)
        user.update(blocked=False, updated_by=current_user.id)
        user.reset_failed_login_count()
        return redirect(url_for(".user_information", user_id=user_id))
    else:
        flash([_("Are you sure you want to unblock this user?")], "unblock")
        return user_information(user_id)


@main.route("/users/<uuid:user_id>/archive", methods=["GET", "POST"])
@user_is_platform_admin
def archive_user(user_id):
    if request.method == "POST":
        user_api_client.archive_user(user_id)
        create_archive_user_event(str(user_id), current_user.id)

        return redirect(url_for(".user_information", user_id=user_id))
    else:
        flash(
            _("There’s no way to reverse this. Are you sure you want to archive this user?"),
            "archive",
        )
        return user_information(user_id)


@main.route("/users/<uuid:user_id>/reset_password", methods=["GET", "POST"])
@user_is_platform_admin
def reset_password(user_id):
    if request.method == "POST":
        user = User.from_id(user_id)
        user_api_client.send_reset_password_url(user.email_address)
        user.update(password_expired=True, updated_by=current_user.id)
        return redirect(url_for(".user_information", user_id=user_id))
    else:
        flash(
            _("Are you sure you want to request a password reset for this user?"),
            "request",
        )
        return user_information(user_id)


@main.route("/users/<uuid:user_id>/make-platform-admin", methods=["POST"])
@user_is_platform_admin
def make_user_platform_admin(user_id):
    user = User.from_id(user_id)
    if user.platform_admin:
        flash([_("User is already a platform admin.")], "info")
        return redirect(url_for(".user_information", user_id=user_id))

    # Optional: ensure only active users can be promoted
    if user.state != "active":
        flash([_("Only active users can be made platform admins.")], "error")
        return redirect(url_for(".user_information", user_id=user_id))

    user.update(platform_admin=True, updated_by=current_user.id)
    flash([_("User promoted to platform admin.")], "default")
    return redirect(url_for(".user_information", user_id=user_id))


@main.route("/users/<uuid:user_id>/update_auth_type", methods=["GET", "POST"])
@user_is_platform_admin
def update_user_auth_type(user_id):
    user = User.from_id(user_id)

    if request.method == "POST":
        selected = (request.form.get("auth_type") or "").strip().lower()
        mapping = {"sms": "sms_auth", "email": "email_auth"}

        if selected not in mapping:
            flash([_("Please choose a valid authentication type.")], "error")
        else:
            user.update(auth_type=mapping[selected], updated_by=current_user.id)
        return redirect(url_for(".user_information", user_id=user_id))

    # Do not render a new page for GET; just go back to the user page.
    return redirect(url_for(".user_information", user_id=user_id))
