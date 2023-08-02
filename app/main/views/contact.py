from flask import redirect, render_template, request, session, url_for
from flask_babel import lazy_gettext as _l
from flask_login import current_user

from app import user_api_client
from app.main import main
from app.main.forms import (
    ContactMessageStep,
    ContactNotify,
    SetUpDemoOrgDetails,
    SetUpDemoPrimaryPurpose,
)

DEFAULT_STEP = "identity"
SESSION_FORM_KEY = "contact_form"


@main.route("/contact", methods=["GET", "POST"])
def contact():
    form = ContactNotify(data=_form_data())
    previous_step = (None,)
    current_step = "identity"
    next_step = ""

    if request.method == "POST" and form.validate_on_submit():
        session[SESSION_FORM_KEY] = form.data
        if form.support_type.data == "demo":
            return redirect(url_for("main.demo_org_details"))
        else:
            return redirect(url_for("main.contact_message"))

    return render_template(
        "views/contact/contact-us.html",
        form=form,
        url=url_for(".contact"),
        current_step=current_step,
        next_step=next_step,
        previous_step=previous_step,
        **_labels(previous_step, current_step, form.support_type.data),
    )


@main.route("/contact/message", methods=["GET", "POST"])
def contact_message():
    form = ContactMessageStep(data=_form_data())
    previous_step = ("identity",)
    current_step = "message"
    next_step = None

    if request.method == "POST" and form.validate_on_submit():
        send_contact_request(form)
        return render_template(
            "views/contact/thanks.html",
        )

    return render_template(
        "views/contact/message.html",
        form=form,
        url=url_for("main.contact_message"),
        current_step=current_step,
        next_step=next_step,
        previous_step=previous_step,
        **_labels(previous_step, current_step, form.support_type.data),
    )


@main.route("/contact/organization-details", methods=["GET", "POST"])
def demo_org_details():
    form = SetUpDemoOrgDetails(data=_form_data())
    previous_step = "identity"
    current_step = "demo.org_details"
    next_step = "demo.primary_purpose"

    if request.method == "POST" and form.validate_on_submit():
        session[SESSION_FORM_KEY] = form.data
        return redirect(url_for("main.demo_primary_purpose"))

    return render_template(
        "views/contact/demo-org-details.html",
        form=form,
        url=url_for("main.demo_org_details"),
        current_step=current_step,
        next_step=next_step,
        previous_step=previous_step,
        step_hint=1,
        total_steps_hint=2,
        **_labels(previous_step, current_step, form.support_type.data),
    )


@main.route("/contact/primary-purpose", methods=["GET", "POST"])
def demo_primary_purpose():
    form = SetUpDemoPrimaryPurpose(data=_form_data())
    previous_step = "demo.org_details"
    current_step = "demo.primary_purpose"
    next_step = None

    if request.method == "POST" and form.validate_on_submit():
        session.pop(SESSION_FORM_STEP, None)
        send_contact_request(form)

    return render_template(
        "views/contact/demo-primary-purpose.html",
        form=form,
        url=url_for("main.demo_primary_purpose"),
        current_step=current_step,
        next_step=next_step,
        previous_step=previous_step,
        step_hint=2,
        total_steps_hint=2,
        **_labels(previous_step, current_step, form.support_type.data),
    )


def _form_data():
    fallback = {}
    if current_user.is_authenticated:
        fallback = {
            "name": current_user.name,
            "email_address": current_user.email_address,
        }
    return session.get(SESSION_FORM_KEY, fallback)


def _labels(previous_step, current_step, support_type):
    back_link = url_for(".contact")
    message_label = None

    if current_step in ["demo.org_details", "demo.primary_purpose"]:
        page_title = _l("Set up a demo")
        if current_step == "demo.primary_purpose":
            back_link = url_for("main.demo_org_details")
    elif current_step == "message":
        if support_type == "other":
            page_title = _l("Tell us more")
            message_label = _l("Your message")
        elif support_type == "give_feedback":
            page_title = _l("Give feedback")
            message_label = _l("How can we do better?")
        elif support_type == "technical_support":
            page_title = _l("Get technical support")
            message_label = _l("Describe the problem.")
        elif support_type == "ask_question":
            page_title = _l("Ask a question")
            message_label = _l("Your question")
        else:
            raise NotImplementedError(f"Unsupported support_type: {str(support_type)}")
    else:
        page_title = _l("Contact us")
        back_link = None

    return {
        "page_title": page_title,
        "back_link": back_link,
        "message_label": message_label,
    }


def send_contact_request(form: SetUpDemoPrimaryPurpose):
    of_interest = {
        "name",
        "support_type",
        "email_address",
        "department_org_name",
        "program_service_name",
        "intended_recipients",
        "main_use_case",
        "main_use_case_details",
        "message",
    }
    data = {key: form.data[key] for key in of_interest if key in form.data}
    if current_user and current_user.is_authenticated:
        data["user_profile"] = url_for(".user_information", user_id=current_user.id, _external=True)

    data["friendly_support_type"] = str(dict(form.support_type.choices)[form.support_type.data])
    user_api_client.send_contact_request(data)


@main.route("/support/ask-question-give-feedback", endpoint="redirect_contact")
def redirect_contact():
    return redirect(url_for("main.contact"), code=301)
