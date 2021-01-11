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

from app import billing_api_client, service_api_client
from app.main import main
from app.main.forms import (
    CreateServiceStepEmailFromForm,
    CreateServiceStepLogoForm,
    CreateServiceStepNameForm,
    FieldWithLanguageOptions,
)
from app.utils import email_safe, user_is_gov_user, user_is_logged_in

# Constants

SESSION_FORM_KEY = 'add_service_form'

DEFAULT_ORGANISATION_TYPE: str = "central"

STEP_NAME: str = "choose_service_name"
STEP_EMAIL: str = "choose_email_from"
STEP_LOGO: str = "choose_logo"

DEFAULT_STEP = STEP_NAME

STEP_NAME_HEADER: str = _("Name your service")
STEP_LOGO_HEADER: str = _("Choose a logo for your service")
STEP_EMAIL_HEADER: str = _("Create sending email address")

WIZARD_ORDER = [
    DEFAULT_STEP,
    STEP_EMAIL,
    STEP_LOGO
]

# wizard list init here for current_app context usage
WIZARD_DICT = {
    DEFAULT_STEP: {
        "form_cls": CreateServiceStepNameForm,
        "header": STEP_NAME_HEADER,
        "tmpl": "partials/add-service/step-create-service.html"
    },
    STEP_EMAIL: {
        "form_cls": CreateServiceStepEmailFromForm,
        "header": STEP_EMAIL_HEADER,
        "tmpl": "partials/add-service/step-choose-email.html"
    },
    STEP_LOGO: {
        "form_cls": CreateServiceStepLogoForm,
        "header": STEP_LOGO_HEADER,
        "tmpl": "partials/add-service/step-choose-logo.html"
    }
}


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


def _renderTemplateStep(form, current_step) -> Text:
    back_link = None
    step_num = WIZARD_ORDER.index(current_step) + 1
    if step_num > 1:
        back_link = url_for('.add_service', current_step=WIZARD_ORDER[step_num - 2])
    return render_template(
        'views/add-service.html',
        form=form,
        heading=_(WIZARD_DICT[current_step]['header']),
        step_num=step_num,
        step_max=len(WIZARD_ORDER),
        tmpl=WIZARD_DICT[current_step]['tmpl'],
        back_link=back_link
    )


@main.route("/add-service", methods=['GET', 'POST'])
@user_is_logged_in
@user_is_gov_user
def add_service():
    current_step = request.args.get('current_step', None)
    # if nothing supplied or bad data in the querystring, default
    if not current_step or current_step not in WIZARD_ORDER:
        current_step = DEFAULT_STEP
    # init session
    if SESSION_FORM_KEY not in session:
        session[SESSION_FORM_KEY] = {}
    # get the right form class
    form_cls = WIZARD_DICT[current_step]['form_cls']
    # as the form always does a 302 after success, GET is a fresh form with possible re-use of session data i.e. Back
    if request.method == "GET":
        return _renderTemplateStep(form_cls(data=session[SESSION_FORM_KEY]), current_step)
    # must be a POST, continue to validate
    form = form_cls(request.form)
    if not form.validate_on_submit():
        # invalid form, re-render with validation response
        return _renderTemplateStep(form, current_step)
    # valid form, save data and move on or finalize
    # get the current place in the wizard based on ordering
    idx = WIZARD_ORDER.index(current_step)
    if idx < len(WIZARD_ORDER) - 1:
        # more steps to go, save valid submitted data to session and redirct to next form
        current_step = WIZARD_ORDER[idx + 1]
        session[SESSION_FORM_KEY].update(form.data)
        return redirect(url_for('.add_service', current_step=current_step))
    # no more steps left, re-validate validate session in case of stale session data
    data = session[SESSION_FORM_KEY]
    data.update(form.data) # add newly submitted data from POST
    # iterate through all forms and validate
    for step in WIZARD_ORDER:
        temp_form_cls = WIZARD_DICT[step]['form_cls']
        temp_form = temp_form_cls(data=data)
        if not temp_form.validate(): # something isn't right, jump to the form with bad / missing data
            return redirect(url_for('.add_service', current_step=step))

    # all forms valid from session data, time to transact
    email_from = email_safe(data['email_from'])
    service_name = data['name']
    default_branding_is_french = \
        data['default_branding'] == FieldWithLanguageOptions.FRENCH_OPTION_VALUE

    service_result: ServiceResult = _create_service(
        service_name,
        DEFAULT_ORGANISATION_TYPE,
        email_from,
        default_branding_is_french,
    )

    # clear session after API POST
    session.pop(SESSION_FORM_KEY, None)

    if (service_result.is_success()):
        return redirect(url_for('main.service_dashboard', service_id=service_result.service_id))
    form_cls = WIZARD_DICT[current_step]['form_cls']
    form = form_cls(request.form)
    session[SESSION_FORM_KEY] = form.data
    if isinstance(service_result, DuplicateNameResult):
        form.validate()  # Necessary to make the `errors` field mutable!
        form.name.errors.append(_("This service name is already in use"))
    return _renderTemplateStep(form, current_step)
