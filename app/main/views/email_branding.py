from flask import (
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_babel import _
from notifications_utils.template import HTMLEmailTemplate

from app import current_service, email_branding_client
from app.main import main
from app.main.forms import BrandingGOCForm, BrandingRequestForm, SearchByNameForm, ServiceUpdateEmailBranding
from app.s3_client.s3_logo_client import (
    TEMP_TAG,
    delete_email_temp_file,
    delete_email_temp_files_created_by,
    permanent_email_logo_name,
    persist_logo,
    upload_email_logo,
)
from app.utils import get_logo_cdn_domain, user_has_permissions, user_is_platform_admin


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


# NEW BRANDING
@main.route("/services/<service_id>/edit-branding", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def edit_branding_settings(service_id):
    default_en_filename = "{}/gc-logo-en.png".format(get_logo_url())
    default_fr_filename = "{}/gc-logo-fr.png".format(get_logo_url())
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
    logos = email_branding_client.get_all_email_branding()
    custom_logos = [logo for logo in logos if logo["brand_type"] in ["custom_logo", "custom_logo_with_background_colour"]]

    form = BrandingGOCForm()
    form.goc_branding.choices = [(logo["id"], logo["name"]) for logo in custom_logos]

    if form.validate_on_submit():
        # current_service.update(email_branding=form.goc_branding.data)
        # save the logo they want to preview to session
        session["branding_to_preview"] = [logo for logo in logos if logo["id"] in [form.goc_branding.data]][0]
        # return render_template("views/email-branding/branding-preview.html", template=get_preview_template(branding_to_preview))
        return redirect(url_for("main.preview_branding", service_id=service_id))

    return render_template("views/email-branding/branding-pool.html", logos=custom_logos, url=get_logo_url(), form=form)


@main.route("/services/<service_id>/branding-request", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def create_branding_request(service_id):
    form = BrandingRequestForm()

    if form.validate_on_submit():
        print('form valid')
    else:
        print('form invalid')
        
    return render_template("views/email-branding/branding-request.html", form=form, template=get_preview_template_custom_placeholder())


@main.route("/services/<service_id>/preview-branding", methods=["GET", "POST"])
@user_has_permissions("manage_service")
def preview_branding(service_id):
    # save branding on post
    if request.method == "POST":
        current_service.update(email_branding=session["branding_to_preview"]["id"])
        session.pop("branding_to_preview")
        flash(_("Setting updated"), "default_with_tick")
        return redirect(url_for("main.view_branding_settings", service_id=service_id))

    # show the branding in session if there is one
    if session.get("branding_to_preview"):
        branding_to_preview = session["branding_to_preview"]
        return render_template("views/email-branding/branding-preview.html", template=get_preview_template(branding_to_preview))

    # otherwise show them the branding saved in their service
    return render_template("views/email-branding/branding-preview.html", template=get_preview_template())


# Branding Utilities
def get_logo_url():
    return "https://{}".format(get_logo_cdn_domain())


def get_preview_template(email_branding=None):
    if email_branding:
        branding_type = email_branding["brand_type"]
        colour = email_branding["colour"]
        brand_text = email_branding["text"]
        brand_colour = colour
        brand_logo = "https://{}/{}".format(get_logo_cdn_domain(), email_branding["logo"]) if email_branding["logo"] else None
        fip_banner_english = branding_type in ["fip_english", "both_english"]
        fip_banner_french = branding_type in ["fip_french", "both_french"]
        logo_with_background_colour = branding_type == "custom_logo_with_background_colour"
        brand_name = email_branding["name"]
    else:
        if current_service.email_branding_id is None:
            if current_service.default_branding_is_french:
                brand_text = None
                brand_colour = None
                brand_logo = None
                fip_banner_english = False
                fip_banner_french = True
                logo_with_background_colour = False
                brand_name = None
            else:
                brand_text = None
                brand_colour = None
                brand_logo = None
                fip_banner_english = True
                fip_banner_french = False
                logo_with_background_colour = False
                brand_name = None
        else:
            email_branding = email_branding_client.get_email_branding(current_service.email_branding_id)["email_branding"]
            branding_type = email_branding["brand_type"]
            colour = email_branding["colour"]
            brand_text = email_branding["text"]
            brand_colour = colour
            brand_logo = "https://{}/{}".format(get_logo_cdn_domain(), email_branding["logo"]) if email_branding["logo"] else None
            fip_banner_english = branding_type in ["fip_english", "both_english"]
            fip_banner_french = branding_type in ["fip_french", "both_french"]
            logo_with_background_colour = branding_type == "custom_logo_with_background_colour"
            brand_name = email_branding["name"]

    template = {"subject": "foo", "content": "# SAMPLE EMAIL\nThis message is to preview your branding settings"}

    html_template = str(
        HTMLEmailTemplate(
            template,
            fip_banner_english=fip_banner_english,
            fip_banner_french=fip_banner_french,
            brand_text=brand_text,
            brand_colour=brand_colour,
            brand_logo=brand_logo,
            logo_with_background_colour=logo_with_background_colour,
            brand_name=brand_name,
        )
    )

    return html_template

def get_preview_template_custom_placeholder():
    template = {"subject": "foo", "content": "# SAMPLE EMAIL\nThis message is to preview your branding settings"}
    html_template = str(
        HTMLEmailTemplate(
            template,
            fip_banner_english=False,
            fip_banner_french=False,
            brand_text=None,
            brand_colour=None,
            brand_logo="https://example.com",
            logo_with_background_colour=False,
            brand_name="example",
        )
    )

    return html_template
