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
    CreateServiceStep1Form,
    CreateServiceStep2Form,
    FieldWithLanguageOptions,
)
from app.utils import (
    email_safe,
    get_logo_cdn_domain,
    user_is_gov_user,
    user_is_logged_in,
)

# Constants

DEFAULT_ORGANISATION_TYPE: str = "central"

STEP1: str = "choose_service_name"
STEP2: str = "choose_logo"
STEP3: str = "create_service"

STEP1_HEADER: str = "Name your service in both official languages"
STEP2_HEADER: str = "Choose a logo for your service"

NEXT_STEP: str = "next_step"
CURR_STEP: str = "current_step"


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
        else:
            raise e


def _getSelectBilingualChoices() -> dict:
    cdn_url = get_logo_cdn_domain()
    default_en_filename = "https://{}/gov-canada-en.svg".format(cdn_url)
    default_fr_filename = "https://{}/gov-canada-fr.svg".format(cdn_url)
    choices = [
        (FieldWithLanguageOptions.ENGLISH_OPTION_VALUE, _('English GC logo') + '||' + default_en_filename),
        (FieldWithLanguageOptions.FRENCH_OPTION_VALUE, _('French GC logo') + '||' + default_fr_filename),
    ]
    return choices


def _prune_steps(form: ImmutableMultiDict) -> ImmutableMultiDict:
    pruned = form.to_dict()
    del pruned[CURR_STEP]
    del pruned[NEXT_STEP]
    return ImmutableMultiDict(pruned)


def _renderTemplateStep1(form: CreateServiceStep1Form,
                         default_organisation_type: str = DEFAULT_ORGANISATION_TYPE) -> Text:
    return render_template(
        'views/add-service.html',
        form=form,
        heading=_(STEP1_HEADER),
        default_organisation_type=default_organisation_type,
        current_step=STEP1,
        next_step=STEP2
    )


def _renderTemplateStep2(form: CreateServiceStep2Form,
                         default_organisation_type: str = DEFAULT_ORGANISATION_TYPE) -> Text:
    return render_template(
        'views/add-service.html',
        form=form,
        heading=_(STEP2_HEADER),
        default_organisation_type=default_organisation_type,
        current_step=STEP2,
        next_step=STEP3
    )


@main.route("/add-service", methods=['GET', 'POST'])
@user_is_logged_in
@user_is_gov_user
def add_service():
    # Step 1 - Choose the service name
    if CURR_STEP not in request.form:
        formStep1 = CreateServiceStep1Form(organisation_type=DEFAULT_ORGANISATION_TYPE)
        return _renderTemplateStep1(formStep1)

    # Step 2 - Choose default bilingual logo
    elif request.form.get(NEXT_STEP) == STEP2:
        formStep1 = CreateServiceStep1Form(request.form, organisation_type=DEFAULT_ORGANISATION_TYPE)
        if not formStep1.validate_on_submit():
            return _renderTemplateStep1(formStep1)

        formStep2 = CreateServiceStep2Form(
            choices=_getSelectBilingualChoices(),
            formdata=_prune_steps(request.form),
            organisation_type=DEFAULT_ORGANISATION_TYPE
        )
        return _renderTemplateStep2(formStep2)

    # Step 3 - Final step which creates the service
    elif request.form.get(NEXT_STEP) == STEP3:
        formStep2 = CreateServiceStep2Form(_prune_steps(request.form), organisation_type=DEFAULT_ORGANISATION_TYPE)
        if not formStep2.validate_on_submit():
            return _renderTemplateStep2(formStep2)

        email_from = email_safe(formStep2.name.data)
        service_name = formStep2.name.data
        default_branding_is_french = \
            formStep2.default_branding.data == FieldWithLanguageOptions.FRENCH_OPTION_VALUE

        serviceResult: ServiceResult = _create_service(
            service_name,
            DEFAULT_ORGANISATION_TYPE,
            email_from,
            default_branding_is_french,
        )

        if (serviceResult.is_success()):
            return redirect(url_for('main.service_dashboard', service_id=serviceResult.service_id))
        elif isinstance(serviceResult, DuplicateNameResult):
            formStep1 = CreateServiceStep1Form(_prune_steps(request.form), organisation_type=DEFAULT_ORGANISATION_TYPE)
            formStep1.validate()  # Necessary to make the `errors` field mutable!
            formStep1.name.errors.append(_("This service name is already in use"))
            return _renderTemplateStep1(formStep1)
        else:
            return _renderTemplateStep2(formStep2)
    else:
        # Ultimate fallback if steps recognition failed -- get back to step 1.
        formStep1 = CreateServiceStep1Form(organisation_type=DEFAULT_ORGANISATION_TYPE)
        return _renderTemplateStep1(formStep1)
