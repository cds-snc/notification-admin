from urllib.error import HTTPError

from flask import abort, current_app, flash, redirect, render_template, request, session, url_for
from flask_babel import _
from flask_login import current_user
from markupsafe import Markup

from app.main import main
from app.models.organisation import Organisation
from app.models.service import Service
from app.models.user import InvitedOrgUser, InvitedUser, OrganisationUsers, User, Users
from app.notify_client import InviteTokenError


@main.route("/invitation/<token>")
def accept_invite(token):
    # For HEAD requests, just return a 200 OK without processing the invitation
    if request.method == "HEAD":
        return "", 200
    try:
        invited_user = InvitedUser.from_token(token)
    except InviteTokenError as exception:
        flash(_(str(exception)))
        return redirect(url_for("main.sign_in"))
    except Exception as e:
        current_app.logger.warning(f"Error accepting invite: {e}")
        flash(_("There was a problem adding you to this service. Try the link again."), "error")
        return redirect(url_for("main.sign_in"))

    if not current_user.is_anonymous and current_user.email_address.lower() != invited_user.email_address.lower():
        message = Markup(
            _(
                "You’re signed in as %(email)s. This invite is for another email address. "
                + "<a href=%(href)s>Sign out</a> and click the link again to accept this invite.",
                email=current_user.email_address,
                href=url_for("main.sign_out", _external=True),
            )
        )
        flash(message=message)

        abort(403)

    if invited_user.status == "cancelled":
        service = Service.from_id(invited_user.service)
        return render_template(
            "views/cancelled-invitation.html",
            from_user=invited_user.from_user.name,
            service_name=service.name,
        )

    if invited_user.status == "accepted":
        session.pop("invited_user", None)
        flash(_("You've already been added to this service."), "default_with_tick")
        return redirect(url_for("main.service_dashboard", service_id=invited_user.service))

    session["invited_user"] = invited_user.serialize()

    existing_user = User.from_email_address_or_none(invited_user.email_address)

    if existing_user:
        invited_user.accept_invite()
        if existing_user in Users(invited_user.service):
            return redirect(url_for("main.service_dashboard", service_id=invited_user.service))
        else:
            service = Service.from_id(invited_user.service)
            if current_app.config["FF_AUTH_V2"]:
                try:
                    existing_user.update(auth_type=invited_user.auth_type)
                except Exception as e:
                    current_app.logger.info(f"[UPDATE_EXISTING_USER]: Error on `existing_user.update()`: {e}")

                try:
                    existing_user.add_to_service(
                        service_id=invited_user.service,
                        permissions=invited_user.permissions,
                        folder_permissions=invited_user.folder_permissions,
                    )
                except HTTPError as e:
                    if e.status_code == 409:
                        flash(_("You've already been added to this service."), "default_with_tick")
                    else:
                        flash(_("There was a problem adding you to this service. Try the link again."), "error")

                return redirect(url_for("main.service_dashboard", service_id=service.id))
            else:
                # if the service you're being added to can modify auth type, then check if this is relevant
                if service.has_permission("email_auth") and (
                    # they have a phone number, we want them to start using it. if they dont have a mobile we just
                    # ignore that option of the invite
                    (existing_user.mobile_number and invited_user.auth_type == "sms_auth")
                    or
                    # we want them to start sending emails. it's always valid, so lets always update
                    invited_user.auth_type == "email_auth"
                ):
                    try:
                        existing_user.update(auth_type=invited_user.auth_type)
                    except Exception as e:
                        current_app.logger.info(f"[UPDATE_EXISTING_USER]: Error on `existing_user.update()`: {e}")
                try:
                    existing_user.add_to_service(
                        service_id=invited_user.service,
                        permissions=invited_user.permissions,
                        folder_permissions=invited_user.folder_permissions,
                    )
                except HTTPError as e:
                    if e.status_code == 409:
                        flash(_("You've already been added to this service."), "default_with_tick")
                    else:
                        flash(_("There was a problem adding you to this service. Try the link again."), "error")

                return redirect(url_for("main.service_dashboard", service_id=service.id))
    else:
        return redirect(url_for("main.register_from_invite"))


@main.route("/organisation-invitation/<token>")
def accept_org_invite(token):
    try:
        invited_org_user = InvitedOrgUser.from_token(token)
    except InviteTokenError:
        current_app.logger.warning(f"Bad org invite token: {token}")
        flash(message=_("bad invitation link"))
        abort(403)

    if not current_user.is_anonymous and current_user.email_address.lower() != invited_org_user.email_address.lower():
        message = Markup(
            _(
                "You’re signed in as %(email)s. This invite is for another email address. "
                + "<a href=%(href)s>Sign out</a> and click the link again to accept this invite.",
                email=current_user.email_address,
                href=url_for("main.sign_out", _external=True),
            )
        )
        flash(message=message)

        abort(403)

    if invited_org_user.status == "cancelled":
        organisation = Organisation.from_id(invited_org_user.organisation)
        return render_template(
            "views/cancelled-invitation.html",
            from_user=invited_org_user.invited_by.name,
            organisation_name=organisation.name,
        )

    if invited_org_user.status == "accepted":
        session.pop("invited_org_user", None)
        return redirect(url_for("main.organisation_dashboard", org_id=invited_org_user.organisation))

    session["invited_org_user"] = invited_org_user.serialize()

    existing_user = User.from_email_address_or_none(invited_org_user.email_address)
    organisation_users = OrganisationUsers(invited_org_user.organisation)

    if existing_user:
        invited_org_user.accept_invite()
        if existing_user not in organisation_users:
            existing_user.add_to_organisation(organisation_id=invited_org_user.organisation)
        return redirect(url_for("main.organisation_dashboard", org_id=invited_org_user.organisation))
    else:
        return redirect(url_for("main.register_from_org_invite"))
