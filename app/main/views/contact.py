from flask import redirect, render_template, request, session, url_for
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
steps = [
    {
        "form": ContactNotify,
        "current_step": "identity",
        "previous_step": None,
        "next_step": "message",
    },
    {
        "form": ContactMessageStep,
        "current_step": "message",
        "previous_step": "identity",
        "next_step": None,
        "support_types": ['ask_question', 'technical_support', 'give_feedback', 'other'],
    },
    {
        "form": SetUpDemoOrgDetails,
        "current_step": "set_up_demo.org_details",
        "previous_step": "identity",
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


@main.route('/contact', methods=['GET', 'POST'])
def contact():
    current_step = request.args.get('current_step', session.get("contact_form_step", DEFAULT_STEP))
    try:
        form_obj = [e for e in steps if e["current_step"] == current_step][0]
    except IndexError:
        return redirect(url_for('.contact', current_step=DEFAULT_STEP))
    form = form_obj["form"](data=session.get("contact_form", {}))

    # Validating the final form
    if form_obj["next_step"] is None and form.validate_on_submit():
        session.pop("contact_form", None)
        session.pop("contact_form_step", None)
        send_form_to_freshdesk(form)
        return render_template('views/contact/thanks.html')

    # Going on to the next step in the form
    if form.validate_on_submit():
        candidates = [e for e in steps if e["previous_step"] == current_step]
        try:
            if len(candidates) == 1:
                form_obj = candidates[0]
            else:
                form_obj = [
                    e for e in candidates if form.support_type.data in e["support_types"]
                ][0]
        except IndexError:
            return redirect(url_for('.contact', current_step=DEFAULT_STEP))
        form = form_obj["form"](data=session.get("contact_form", {}))

    session["contact_form"] = form.data
    session["contact_form_step"] = form_obj["current_step"]

    return render_template(
        'views/contact/form.html',
        form=form,
        next_step=form_obj["next_step"],
        current_step=form_obj["current_step"],
        previous_step=form_obj["previous_step"],
        step=form_obj.get("step"),
        total_steps=form_obj.get("total_steps"),
    )


def send_form_to_freshdesk(form):
    if form.support_type.data == "demo":
        message = '<br><br>'.join([
            f'- user: {form.name.data} {form.email_address.data}',
            f'- department/org: {form.department_org_name.data}',
            f'- program/service: {form.program_service_name.data}',
            f'- intended_recipients: {form.intended_recipients.data}',
            f'- main use case: {form.main_use_case.data}',
            f'- main use case details: {form.main_use_case_details.data}',
        ])
    else:
        message = form.message.data

    if current_user and current_user.is_authenticated:
        user_profile = url_for('.user_information', user_id=current_user.id, _external=True)
        message += f"<br><br>---<br><br> {user_profile}"

    friendly_support_type = str(dict(form.support_type.choices)[form.support_type.data])

    user_api_client.send_contact_email(
        form.name.data,
        form.email_address.data,
        message,
        friendly_support_type
    )


@main.route('/support/ask-question-give-feedback', endpoint='redirect_contact')
def redirect_contect():
    return redirect(url_for('main.contact'), code=301)
