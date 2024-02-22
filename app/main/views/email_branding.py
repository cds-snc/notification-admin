from app import current_service
from flask import current_app, flash, redirect, render_template, session, url_for

from app import email_branding_client
from app.main import main
from app.main.forms import BrandingGOCForm, SearchByNameForm, ServiceUpdateEmailBranding
from app.s3_client.s3_logo_client import (
    TEMP_TAG,
    delete_email_temp_file,
    delete_email_temp_files_created_by,
    permanent_email_logo_name,
    persist_logo,
    upload_email_logo,
)
from app.utils import get_logo_cdn_domain, user_has_permissions, user_is_platform_admin
from flask_babel import _

@main.route("/email-branding", methods=["GET", "POST"])
@user_is_platform_admin
def email_branding():
    brandings = email_branding_client.get_all_email_branding(sort_key="name")

    return render_template(
        "views/email-branding/select-branding.html",
        email_brandings=brandings,
        search_form=SearchByNameForm(),
    )


@main.route("/email-branding/<branding_id>/edit", methods=["GET", "POST"])
@main.route("/email-branding/<branding_id>/edit/<logo>", methods=["GET", "POST"])
@user_is_platform_admin
def update_email_branding(branding_id, logo=None):
    email_branding = email_branding_client.get_email_branding(branding_id)["email_branding"]

    form = ServiceUpdateEmailBranding(
        name=email_branding["name"],
        text=email_branding["text"],
        colour=email_branding["colour"],
        brand_type=email_branding["brand_type"],
    )

    logo = logo if logo else email_branding.get("logo") if email_branding else None

    if form.validate_on_submit():
        if form.file.data:
            upload_filename = upload_email_logo(
                form.file.data.filename,
                form.file.data,
                current_app.config["AWS_REGION"],
                user_id=session["user_id"],
            )

            if logo and logo.startswith(TEMP_TAG.format(user_id=session["user_id"])):
                delete_email_temp_file(logo)

            return redirect(
                url_for(
                    ".update_email_branding",
                    branding_id=branding_id,
                    logo=upload_filename,
                )
            )

        updated_logo_name = permanent_email_logo_name(logo, session["user_id"]) if logo else None

        email_branding_client.update_email_branding(
            branding_id=branding_id,
            logo=updated_logo_name,
            name=form.name.data,
            text=form.text.data,
            colour=form.colour.data,
            brand_type=form.brand_type.data,
        )

        if logo:
            persist_logo(logo, updated_logo_name)

        delete_email_temp_files_created_by(session["user_id"])

        return redirect(url_for(".email_branding", branding_id=branding_id))

    return render_template(
        "views/email-branding/manage-branding.html",
        form=form,
        email_branding=email_branding,
        cdn_url=get_logo_cdn_domain(),
        logo=logo,
    )


@main.route("/email-branding/create", methods=["GET", "POST"])
@main.route("/email-branding/create/<logo>", methods=["GET", "POST"])
@user_is_platform_admin
def create_email_branding(logo=None):
    form = ServiceUpdateEmailBranding(brand_type="custom_logo")

    if form.validate_on_submit():
        if form.file.data:
            upload_filename = upload_email_logo(
                form.file.data.filename,
                form.file.data,
                current_app.config["AWS_REGION"],
                user_id=session["user_id"],
            )

            if logo and logo.startswith(TEMP_TAG.format(user_id=session["user_id"])):
                delete_email_temp_file(logo)

            return redirect(url_for(".create_email_branding", logo=upload_filename))

        updated_logo_name = permanent_email_logo_name(logo, session["user_id"]) if logo else None

        email_branding_client.create_email_branding(
            logo=updated_logo_name,
            name=form.name.data,
            text=form.text.data,
            colour=form.colour.data,
            brand_type=form.brand_type.data,
        )

        if logo:
            persist_logo(logo, updated_logo_name)

        delete_email_temp_files_created_by(session["user_id"])

        return redirect(url_for(".email_branding"))

    return render_template(
        "views/email-branding/manage-branding.html",
        form=form,
        cdn_url=get_logo_cdn_domain(),
        logo=logo,
    )


### NEW BRANDING ###
@main.route("/services/<service_id>/edit-branding", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def edit_branding_settings(service_id):
    # redirect back to start if branding not in session
    if not session.get("branding"):
        return redirect(url_for("main.view_branding_settings", service_id=service_id))        
    
    cdn_url = get_logo_cdn_domain()
    default_en_filename = "https://{}/gov-canada-en.svg".format(cdn_url)
    default_fr_filename = "https://{}/gov-canada-fr.svg".format(cdn_url)
    choices = [
        (default_en_filename),
        (default_fr_filename),
    ]
    form = BrandingGOCForm()

    if form.validate_on_submit():
        default_branding_is_french = form.data["goc_branding"] == BrandingGOCForm.DEFAULT_FR[0]
        current_service.update(email_branding=None, default_branding_is_french=default_branding_is_french)

        flash(_("Setting updated"), "default_with_tick")
        return redirect(url_for("main.view_branding_settings", service_id=service_id))
    
    return render_template("views/email-branding/branding-goc.html", choices=choices, form=form)

@main.route("/services/<service_id>/review-pool", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def review_branding_pool(service_id):
    return render_template("views/email-branding/branding-pool.html")

@main.route("/services/<service_id>/branding-request", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def create_branding_request(service_id):
    return render_template("views/email-branding/branding-request.html")

@main.route("/services/<service_id>/preview-branding", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def preview_branding(service_id):
    return render_template("views/email-branding/branding-preview.html")