from flask import current_app, redirect, render_template, request, session, url_for
from flask_babel import _, lazy_gettext as _l
from notifications_python_client.errors import HTTPError
from werkzeug.datastructures import ImmutableMultiDict

from app import billing_api_client, service_api_client
from app.main import main
from app.main.forms import CreateServiceStep1Form, CreateServiceStep2Form
from app.utils import email_safe, user_is_gov_user, user_is_logged_in


def _create_service(service_name, organisation_type, email_from, form):
    free_sms_fragment_limit = current_app.config['DEFAULT_FREE_SMS_FRAGMENT_LIMITS'].get(organisation_type)

    try:
        service_id = service_api_client.create_service(
            service_name=service_name,
            organisation_type=organisation_type,
            message_limit=current_app.config['DEFAULT_SERVICE_LIMIT'],
            restricted=True,
            user_id=session['user_id'],
            email_from=email_from,
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


@main.route("/add-service", methods=['GET', 'POST'])
@user_is_logged_in
@user_is_gov_user
def add_service():
    default_organisation_type = "central"
    
    # Step 1 - Choose the service name
    if "current_step" not in request.form:
        form = CreateServiceStep1Form(organisation_type=default_organisation_type)
        heading = _('Name your service in both official languages')
        return render_template(
            'views/add-service.html', 
            form=form, 
            heading=heading, 
            current_step="choose_service_name",
            next_step="choose_logo"
        )

    # Step 2 - Choose default bilingual logo
    elif request.form["next_step"] == "choose_logo":
        heading = _('Choose a logo for your service')
        form = CreateServiceStep2Form(
            formdata = prune_steps(request.form)
        )

        # TODO: Validate the form for service name
        # if form.validate_on_submit():
 
        return render_template(
            'views/add-service.html',
            form=form,
            heading=heading,
            default_organisation_type=default_organisation_type,
            current_step="choose_logo",
            next_step="create_service"
        )

    # Step 3 - Final step which creates the service
    elif request.form["next_step"] == "create_service":
        form = CreateServiceStep2Form(formdata = prune_steps(request.form))

        if form.validate_on_submit():
            email_from = email_safe(form.name.data)
            service_name = form.name.data

            # REVIEW: Should we create the service only once the bilingual logo has been 
            #         selected? Beth: Create it at the same time through the service.
            service_id, error = _create_service(
                service_name,
                default_organisation_type,
                email_from,
                form,
            )
            if error:
                heading = _('Choose a logo for your service')
                return render_template(
                    'views/add-service.html', 
                    form=form, 
                    heading=heading, 
                    current_step="choose_logo",
                    next_step="create_service"
                )
            else:
                return redirect(url_for('main.service_dashboard', service_id=service_id))
        else:
            heading = _('Choose a logo for your service')
            return render_template(
                'views/add-service.html', 
                form=form, 
                heading=heading, 
                current_step="choose_logo",
                next_step="create_service"
            )

def prune_steps(form):
    pruned = form.to_dict()
    del pruned['current_step']
    del pruned['next_step']
    return ImmutableMultiDict(pruned)