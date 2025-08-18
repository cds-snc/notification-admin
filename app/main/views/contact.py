from flask import current_app, redirect, render_template, request, session, url_for
from flask_babel import lazy_gettext as _l
from flask_login import current_user
from notifications_python_client.errors import HTTPError

from app import get_current_locale, user_api_client
from app.main import main
from app.main.forms import ContactMessageStep, ContactNotify

SESSION_FORM_KEY = "contact_form"


# /contact route: redirect to /<lang_code>/contact
@main.route("/contact", methods=["GET", "POST"])
def contact():
    lang_code = get_current_locale(current_app)
    return redirect(url_for("main.contact_lang", lang_code=lang_code), code=302)


# /<lang_code>/contact route: real contact page
@main.route("/<lang_code>/contact", methods=["GET", "POST"])
def contact_lang(lang_code):
    # Sync session language with lang_code in URL
    if session.get("userlang") != lang_code:
        session["userlang"] = lang_code
        # Reload page to ensure translations update
        return redirect(url_for("main.contact_lang", lang_code=lang_code))

    data = _form_data()
    form = ContactNotify(data=data)
    previous_step = None
    current_step = "identity"
    next_step = ""

    if request.method == "POST" and form.validate_on_submit():
        session[SESSION_FORM_KEY] = form.data
        return redirect(url_for("main.message_lang", lang_code=lang_code))

    return render_template(
        "views/contact/contact-us.html",
        form=form,
        url=url_for("main.contact_lang", lang_code=lang_code),
        current_step=current_step,
        next_step=next_step,
        previous_step=previous_step,
        **_labels(previous_step, current_step, form.support_type.data),
    )


# /<lang_code>/contact/message route: real message page
@main.route("/<lang_code>/contact/message", methods=["GET", "POST"])
def message_lang(lang_code):
    # Sync session language with lang_code in URL
    if session.get("userlang") != lang_code:
        session["userlang"] = lang_code
        # Reload page to ensure translations update
        return redirect(url_for("main.message_lang", lang_code=lang_code))

    data = _form_data()
    form = ContactMessageStep(data=data)
    previous_step = "identity"
    current_step = "message"
    next_step = None

    if request.method == "POST" and form.validate_on_submit():
        send_contact_request(form)
        return render_template(
            "views/contact/thanks.html",
        )
    if not _validate_fields_present(current_step, data):
        return redirect(url_for("main.contact_lang", lang_code=lang_code))

    return render_template(
        "views/contact/message.html",
        form=form,
        url=url_for("main.message_lang", lang_code=lang_code),
        current_step=current_step,
        next_step=next_step,
        previous_step=previous_step,
        **_labels(previous_step, current_step, form.support_type.data),
    )


def _validate_fields_present(current_step: str, form_data: dict) -> bool:
    base_requirement = {"name", "support_type", "email_address"}

    if not form_data or SESSION_FORM_KEY not in session:
        return False
    if current_step == "message":
        return base_requirement.issubset(form_data)

    return False


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
    else:
        page_title = _l("Contact us")
        back_link = None

    return {
        "page_title": page_title,
        "back_link": back_link,
        "message_label": message_label,
    }


def send_contact_request(form):
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

    try:
        user_api_client.send_contact_request(data)
        session.pop(SESSION_FORM_KEY, None)
    except HTTPError:
        pass


@main.route("/support/ask-question-give-feedback", endpoint="redirect_contact")
def redirect_contact():
    return redirect(url_for("main.contact"), code=301)
