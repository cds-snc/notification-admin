from typing import Any

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

DEFAULT_ORGANISATION_TYPE: str = "central"

HEADER_STEP1: str = "Name your service in both official languages"
HEADER_STEP2: str = "Choose a logo for your service"


def _create_service(service_name: str, organisation_type: str, email_from: str,
                    default_branding_is_french: bool, form: CreateServiceStep2Form):
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

        return service_id, None
    except HTTPError as e:
        if e.status_code == 400 and e.message['name']:
            form.name.errors.append(_("This service name is already in use"))
            return None, e
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
    del pruned['current_step']
    del pruned['next_step']
    return ImmutableMultiDict(pruned)


def _renderTemplateStep1(heading: str, form: CreateServiceStep1Form) -> Any:
    return render_template(
        'views/add-service.html',
        form=form,
        heading=heading,
        current_step="choose_service_name",
        next_step="choose_logo"
    )


def _renderTemplateStep2(heading: str, form: CreateServiceStep2Form,
                         default_organisation_type: str = DEFAULT_ORGANISATION_TYPE) -> Any:
    return render_template(
        'views/add-service.html',
        form=form,
        heading=heading,
        default_organisation_type=default_organisation_type,
        current_step="choose_logo",
        next_step="create_service"
    )


@main.route("/add-service", methods=['GET', 'POST'])
@user_is_logged_in
@user_is_gov_user
def add_service():
    # Step 1 - Choose the service name
    if "current_step" not in request.form:
        form = CreateServiceStep1Form(organisation_type=DEFAULT_ORGANISATION_TYPE)
        return _renderTemplateStep1(_(HEADER_STEP1), form)

    # Step 2 - Choose default bilingual logo
    elif request.form["next_step"] == "choose_logo":
        formStep1 = CreateServiceStep1Form(request.form)
        if not formStep1.validate_on_submit():
            return _renderTemplateStep1(_(HEADER_STEP1), formStep1)

        formStep2 = CreateServiceStep2Form(
            choices=_getSelectBilingualChoices(),
            formdata=_prune_steps(request.form)
        )
        return _renderTemplateStep2(_(HEADER_STEP2), formStep2)

    # Step 3 - Final step which creates the service
    elif request.form["next_step"] == "create_service":
        formStep2 = CreateServiceStep2Form(request.form)
        if not formStep2.validate_on_submit():
            return _renderTemplateStep2(_(HEADER_STEP2), formStep2)

        form = CreateServiceStep2Form(formdata=_prune_steps(request.form))
        email_from = email_safe(form.name.data)
        service_name = form.name.data
        default_branding_is_french = form.default_branding.data == FieldWithLanguageOptions.FRENCH_OPTION_VALUE

        service_id, error = _create_service(
            service_name,
            DEFAULT_ORGANISATION_TYPE,
            email_from,
            default_branding_is_french,
            form,
        )
        if error:
            return _renderTemplateStep2(_(HEADER_STEP2), form)
        else:
            return redirect(url_for('main.service_dashboard', service_id=service_id))
