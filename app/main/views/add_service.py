from abc import ABC
from typing import List, Text

from flask import (
    current_app,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_babel import _
from notifications_python_client.errors import HTTPError
from werkzeug.datastructures import ImmutableMultiDict

from app import billing_api_client, service_api_client
from app.main import main
from app.main.forms import (
    CreateServiceStepNameForm,
    CreateServiceStepLogoForm,
    FieldWithLanguageOptions, CreateServiceStepEmailFromForm,
)
from app.utils import (
    email_safe,
    user_is_gov_user,
    user_is_logged_in,
)

# Constants

DEFAULT_ORGANISATION_TYPE: str = "central"

STEP_NAME: str = "choose_service_name"
STEP_EMAIL: str = "choose_email_from"
STEP_LOGO: str = "choose_logo"

STEP_NAME_HEADER: str = _("Name your service in both official languages")
STEP_LOGO_HEADER: str = _("Choose a logo for your service")
STEP_EMAIL_HEADER: str = _("Sending email address")

# wizard list init here for current_app context usage
WIZARD_LIST = [
    {
        "form_cls": CreateServiceStepNameForm,
        "header": STEP_NAME_HEADER,
        "step": STEP_NAME,
    },
    {
        "form_cls": CreateServiceStepEmailFromForm,
        "header": STEP_EMAIL_HEADER,
        "step": STEP_EMAIL,
    },
    {
        "form_cls": CreateServiceStepLogoForm,
        "header": STEP_LOGO_HEADER,
        "step": STEP_LOGO,
    }
]


# Utility classes
class ServiceResult(ABC):
    def __init__(self, errors: List[str] = []):
        self.errors = errors

    def is_success(self) -> bool:
        return not self.errors


class DuplicateNameResult(ServiceResult):
    def __init__(self, errors: List[str]):
        super().__init__(errors)


class SuccessResult(ServiceResult):
    def __init__(self, service_id: str):
        self.service_id = service_id
        super().__init__()


# Utility functions

def _create_service(service_name: str, organisation_type: str, email_from: str,
                    default_branding_is_french: bool) -> ServiceResult:
    free_sms_fragment_limit = current_app.config['DEFAULT_FREE_SMS_FRAGMENT_LIMITS'].get(organisation_type)

    try:
        service_id = service_api_client.create_service(
            service_name=service_name,
            organisation_type=organisation_type,
            message_limit=current_app.config['DEFAULT_SERVICE_LIMIT'],
            restricted=True,
            user_id=session['user_id'],
            email_from=email_from,
            default_branding_is_french=default_branding_is_french,
        )
        session['service_id'] = service_id

        billing_api_client.create_or_update_free_sms_fragment_limit(service_id, free_sms_fragment_limit)

        return SuccessResult(service_id)
    except HTTPError as e:
        if e.status_code == 400 and e.message['name']:
            errors = [_("This service name is already in use")]
            return DuplicateNameResult(errors)
        if e.status_code == 400 and e.message['email_from']:
            errors = [_("This email address is already in use")]
            return DuplicateNameResult(errors)
        else:
            raise e


def _renderTemplateStep(form, curr_idx) -> Text:
    return render_template(
        'views/add-service.html',
        form=form,
        heading=_(WIZARD_LIST[curr_idx]['header']),
        current_step=WIZARD_LIST[curr_idx]['step'],
        step_num=curr_idx + 1,
        step_max=len(WIZARD_LIST)
    )


@main.route("/add-service", methods=['GET', 'POST'])
@user_is_logged_in
@user_is_gov_user
def add_service():
    # Start at 0
    curr_idx = 0
    step_max = len(WIZARD_LIST)
    # if current_step exists in form, validate and move on
    if request.form:
        if request.form.get('current_step', None):
            while curr_idx < step_max:
                if WIZARD_LIST[curr_idx]['step'] == request.form.get('current_step', None):
                    break
                curr_idx += 1
            if curr_idx >= step_max:
                # not found idx, reset to start
                curr_idx = 0

    # initialize form specifics
    form_cls = WIZARD_LIST[curr_idx]['form_cls']
    form = form_cls(request.form)
    if not form.validate_on_submit():
        # return same form
        return _renderTemplateStep(form, curr_idx)
    curr_idx += 1
    if curr_idx < step_max:
        # more steps, ready next form
        form_cls = WIZARD_LIST[curr_idx]['form_cls']
        dict_form = request.form.to_dict()
        dict_form['current_step'] = WIZARD_LIST[curr_idx]['step']  # moving forward form state to next form
        return _renderTemplateStep(form_cls(ImmutableMultiDict(dict_form)), curr_idx)

    # no more forms
    email_from = email_safe(form.email_from.data)
    service_name = form.name.data
    default_branding_is_french = \
        form.default_branding.data == FieldWithLanguageOptions.FRENCH_OPTION_VALUE

    service_result: ServiceResult = _create_service(
        service_name,
        DEFAULT_ORGANISATION_TYPE,
        email_from,
        default_branding_is_french,
    )

    if (service_result.is_success()):
        return redirect(url_for('main.service_dashboard', service_id=service_result.service_id))

    # fall back to start catch-all
    curr_idx = 0
    form_cls = WIZARD_LIST[curr_idx]['form_cls']
    form = form_cls(request.form)
    if isinstance(service_result, DuplicateNameResult):
        form.validate()  # Necessary to make the `errors` field mutable!
        form.name.errors.append(_("This service name is already in use"))
    return _renderTemplateStep(form, curr_idx)
