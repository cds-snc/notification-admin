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
SESSION_FORM_STEP_KEY = "contact_form_step"
steps = [
    {
        "form": ContactNotify,
        "current_step": DEFAULT_STEP,
        "previous_step": None,
        "next_step": "message",
    },
    {
        "form": ContactMessageStep,
        "current_step": "message",
        "previous_step": DEFAULT_STEP,
        "next_step": None,
        "support_types": [
            "ask_question",
            "technical_support",
            "give_feedback",
            "other",
        ],
    },
    {
        "form": SetUpDemoOrgDetails,
        "current_step": "set_up_demo.org_details",
        "previous_step": DEFAULT_STEP,
        "next_step": "set_up_demo.primary_purpose",
        "support_types": ["demo"],
        "step": 1,
        "total_steps": 2,
    },
    {
        "form": SetUpDemoPrimaryPurpose,
        "current_step": "set_up_demo.primary_purpose",
        "previous_step": "set_up_demo.org_details",
        "next_step": None,
        "step": 2,
        "total_steps": 2,
    },
]


@main.route("/contact", methods=["GET", "POST"])
def contact():
    current_step = request.args.get(
        "current_step", session.get(SESSION_FORM_STEP_KEY, DEFAULT_STEP)
    )
    try:
        form_obj = [f for f in steps if f["current_step"] == current_step][0]
    except IndexError:
        return redirect(url_for(".contact", current_step=DEFAULT_STEP))
    form = form_obj["form"](data=_form_data())

    # Validating the final form
    if form_obj["next_step"] is None and form.validate_on_submit():
        session.pop(SESSION_FORM_KEY, None)
        session.pop(SESSION_FORM_STEP_KEY, None)
        send_contact_request(form)
        return render_template("views/contact/thanks.html")

    # Going on to the next step in the form
    if form.validate_on_submit():
        possibilities = [f for f in steps if f["previous_step"] == current_step]
        try:
            if len(possibilities) == 1:
                form_obj = possibilities[0]
            else:
                form_obj = [
                    e
                    for e in possibilities
                    if form.support_type.data in e["support_types"]
                ][0]
        except IndexError:
            return redirect(url_for(".contact", current_step=DEFAULT_STEP))
        form = form_obj["form"](data=_form_data())

    session[SESSION_FORM_KEY] = form.data
    session[SESSION_FORM_STEP_KEY] = form_obj["current_step"]

    return render_template(
        "views/contact/form.html",
        form=form,
        next_step=form_obj["next_step"],
        current_step=form_obj["current_step"],
        previous_step=form_obj["previous_step"],
        step_hint=form_obj.get("step"),
        total_steps_hint=form_obj.get("total_steps"),
        **_labels(
            form_obj["previous_step"], form_obj["current_step"], form.support_type.data
        ),
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
    back_link = url_for(".contact", current_step=previous_step)
    message_label = None

    if current_step == "message":
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
    elif current_step in ["set_up_demo.org_details", "set_up_demo.primary_purpose"]:
        page_title = _l("Set up a demo")
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
        data["user_profile"] = url_for(
            ".user_information", user_id=current_user.id, _external=True
        )

    data["friendly_support_type"] = str(
        dict(form.support_type.choices)[form.support_type.data]
    )
    user_api_client.send_contact_request(data)


@main.route("/support/ask-question-give-feedback", endpoint="redirect_contact")
def redirect_contact():
    return redirect(url_for("main.contact"), code=301)
