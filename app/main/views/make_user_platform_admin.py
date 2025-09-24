from flask import flash, redirect, url_for

from app.main import main
from app.models.user import User
from app.utils import user_is_platform_admin


def _flatten_error(msg):
    if isinstance(msg, dict):
        parts = []
        for v in msg.values():
            if isinstance(v, list):
                parts.extend(str(x) for x in v)
            else:
                parts.append(str(v))
        return "; ".join(parts)
    if isinstance(msg, list):
        return "; ".join(str(x) for x in msg)
    return str(msg)


@main.route("/platform-admin/users/<uuid:user_id>/make-admin", methods=["GET"])
@user_is_platform_admin
def make_user_platform_admin(user_id):
    target_user = User.from_id(user_id)
    if target_user.platform_admin_status:
        flash("User is already a platform admin", "default")
        return redirect(url_for("main.user_information", user_id=target_user.id))

    success, err = target_user.make_platform_admin()
    if success:
        flash("User promoted to platform admin", "default")
    else:
        flash(f"Unable to promote user: {_flatten_error(err)}", "danger")
    return redirect(url_for("main.user_information", user_id=target_user.id))
