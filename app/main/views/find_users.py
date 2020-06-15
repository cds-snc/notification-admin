from flask import flash, redirect, render_template, request, url_for
from flask_babel import _
from flask_login import current_user

from app import user_api_client
from app.event_handlers import create_archive_user_event
from app.main import main
from app.main.forms import SearchUsersByEmailForm
from app.models.user import User
from app.utils import user_is_platform_admin


@main.route("/find-users-by-email", methods=['GET', 'POST'])
@user_is_platform_admin
def find_users_by_email():
    form = SearchUsersByEmailForm()
    users_found = None
    if form.validate_on_submit():
        users_found = user_api_client.find_users_by_full_or_partial_email(form.search.data)['data']
    return render_template(
        'views/find-users/find-users-by-email.html',
        form=form,
        users_found=users_found
    )


@main.route("/users/<user_id>", methods=['GET'])
@user_is_platform_admin
def user_information(user_id):
    return render_template(
        'views/find-users/user-information.html',
        user=User.from_id(user_id),
    )


@main.route("/users/<uuid:user_id>/block", methods=['GET', 'POST'])
@user_is_platform_admin
def block_user(user_id):
    if request.method == 'POST':
        user = User.from_id(user_id)
        user.update(blocked=True, updated_by=current_user.id)
        return redirect(url_for('.user_information', user_id=user_id))
    else:
        flash(['Are you sure you want to block this user?'], 'block')
        return user_information(user_id)


@main.route("/users/<uuid:user_id>/unblock", methods=['GET', 'POST'])
@user_is_platform_admin
def unblock_user(user_id):
    if request.method == 'POST':
        user = User.from_id(user_id)
        user.update(blocked=False, updated_by=current_user.id)
        return redirect(url_for('.user_information', user_id=user_id))
    else:
        flash(['Are you sure you want to unblock this user?'], 'unblock')
        return user_information(user_id)


@main.route("/users/<uuid:user_id>/archive", methods=['GET', 'POST'])
@user_is_platform_admin
def archive_user(user_id):
    if request.method == 'POST':
        user_api_client.archive_user(user_id)
        create_archive_user_event(str(user_id), current_user.id)

        return redirect(url_for('.user_information', user_id=user_id))
    else:
        flash(_("There's no way to reverse this! Are you sure you want to archive this user?"), "archive")
        return user_information(user_id)
