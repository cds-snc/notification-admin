import itertools
import json
from string import ascii_uppercase
from zipfile import BadZipFile

from flask import (
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_babel import _
from flask_babel import lazy_gettext as _l
from flask_login import current_user
from notifications_python_client.errors import HTTPError
from notifications_utils import SMS_CHAR_COUNT_LIMIT
from notifications_utils.columns import Columns
from notifications_utils.recipients import (
    RecipientCSV,
    first_column_headings,
    optional_address_columns,
)
from notifications_utils.sanitise_text import SanitiseASCII
from orderedset import OrderedSet
from xlrd.biffh import XLRDError
from xlrd.xldate import XLDateError

from app import (
    current_service,
    job_api_client,
    notification_api_client,
    service_api_client,
)
from app.main import main
from app.main.forms import (
    ChooseTimeForm,
    CsvUploadForm,
    SelectCsvFromS3Form,
    SetSenderForm,
    get_placeholder_form_instance,
)
from app.models.user import Users
from app.s3_client.s3_csv_client import (
    copy_bulk_send_file_to_uploads,
    list_bulk_send_uploads,
    s3download,
    s3upload,
    set_metadata_on_csv_upload,
)
from app.template_previews import TemplatePreview, get_page_count_for_letter
from app.utils import (
    PermanentRedirect,
    Spreadsheet,
    email_or_sms_not_enabled,
    get_errors_for_csv,
    get_help_argument,
    get_template,
    should_skip_template_page,
    unicode_truncate,
    user_has_permissions,
)


def service_can_bulk_send(service_id):
    bulk_sending_services = [
        current_app.config['HC_EN_SERVICE_ID'],
        current_app.config['HC_FR_SERVICE_ID'],
        current_app.config['BULK_SEND_TEST_SERVICE_ID'],
    ]
    return str(service_id) in bulk_sending_services


def get_csv_max_rows(service_id):
    if service_can_bulk_send(service_id):
        return int(current_app.config['CSV_MAX_ROWS_BULK_SEND'])
    return int(current_app.config['CSV_MAX_ROWS'])


def get_example_csv_fields(column_headers, use_example_as_example, submitted_fields):
    if use_example_as_example:
        return ["example" for header in column_headers]
    elif submitted_fields:
        return [submitted_fields.get(header) for header in column_headers]
    else:
        return list(column_headers)


def get_example_csv_rows(template, use_example_as_example=True, submitted_fields=False):
    return {
        'email': ['test@example.com'] if use_example_as_example else [current_user.email_address],
        'sms': ['6502532222'] if use_example_as_example else [current_user.mobile_number],
        'letter': [
            (submitted_fields or {}).get(
                key, get_example_letter_address(key) if use_example_as_example else key
            )
            for key in first_column_headings['letter']
        ]
    }[template.template_type] + get_example_csv_fields(
        (
            placeholder for placeholder in template.placeholders
            if placeholder not in Columns.from_keys(
                first_column_headings[template.template_type]
            )
        ),
        use_example_as_example,
        submitted_fields
    )


def get_example_letter_address(key):
    return {
        'address line 1': 'A. Name',
        'address line 2': '123 Example Street',
        'postcode': 'XM4 5HQ'
    }.get(key, '')


@main.route("/services/<service_id>/send/<template_id>/csv", methods=['GET', 'POST'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def send_messages(service_id, template_id):
    # if there's lots of data in the session, lets log it for debugging purposes
    # TODO: Remove this once we're confident we have session size under control
    if len(session.get('file_uploads', {}).keys()) > 2:
        current_app.logger.info('session contains large file_uploads - json_len {}, keys: {}'.format(
            len(json.dumps(session['file_uploads'])),
            session['file_uploads'].keys())
        )

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    email_reply_to = None
    sms_sender = None

    if db_template['template_type'] == 'email':
        email_reply_to = get_email_reply_to_address_from_session()
    elif db_template['template_type'] == 'sms':
        sms_sender = get_sms_sender_from_session()

    if email_or_sms_not_enabled(db_template['template_type'], current_service.permissions):
        return redirect(url_for(
            '.action_blocked',
            service_id=service_id,
            notification_type=db_template['template_type'],
            return_to='view_template',
            template_id=template_id
        ))

    template = get_template(
        db_template,
        current_service,
        show_recipient=True,
        letter_preview_url=url_for(
            '.view_letter_template_preview',
            service_id=service_id,
            template_id=template_id,
            filetype='png',
            page_count=get_page_count_for_letter(db_template),
        ),
        email_reply_to=email_reply_to,
        sms_sender=sms_sender,
    )

    form = CsvUploadForm()
    if form.validate_on_submit():
        try:
            upload_id = s3upload(
                service_id,
                Spreadsheet.from_file(form.file.data, filename=form.file.data.filename).as_dict,
                current_app.config['AWS_REGION']
            )
            return redirect(url_for(
                '.check_messages',
                service_id=service_id,
                upload_id=upload_id,
                template_id=template.id,
                original_file_name=form.file.data.filename,
            ))
        except (UnicodeDecodeError, BadZipFile, XLRDError):
            flash(_('Could not read {}. Try using a different file format.').format(
                form.file.data.filename
            ))
        except (XLDateError):
            flash(_(
                '{} contains numbers or dates that GC Notify can’t understand. '
                'Try formatting all columns as ‘text’ or export your file as CSV.'
            ).format(
                form.file.data.filename
            ))

    column_headings = get_spreadsheet_column_headings_from_template(template)

    return render_template(
        'views/send.html',
        template=template,
        column_headings=list(ascii_uppercase[:len(column_headings)]),
        example=[column_headings, get_example_csv_rows(template)],
        form=form
    )


@main.route("/services/<service_id>/send/<template_id>/s3-send", methods=['GET', 'POST'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def s3_send(service_id, template_id):
    # if there's lots of data in the session, lets log it for debugging purposes
    # TODO: Remove this once we're confident we have session size under control
    if len(session.get('file_uploads', {}).keys()) > 2:
        current_app.logger.info('session contains large file_uploads - json_len {}, keys: {}'.format(
            len(json.dumps(session['file_uploads'])),
            session['file_uploads'].keys())
        )

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    email_reply_to = None
    sms_sender = None

    if db_template['template_type'] == 'email':
        email_reply_to = get_email_reply_to_address_from_session()
    elif db_template['template_type'] == 'sms':
        sms_sender = get_sms_sender_from_session()

    is_email_or_sms_not_enabled = email_or_sms_not_enabled(db_template['template_type'], current_service.permissions)
    if is_email_or_sms_not_enabled or not service_can_bulk_send(service_id):
        return redirect(url_for(
            '.action_blocked',
            service_id=service_id,
            notification_type=db_template['template_type'],
            return_to='view_template',
            template_id=template_id
        ))

    template = get_template(
        db_template,
        current_service,
        show_recipient=True,
        letter_preview_url=url_for(
            '.view_letter_template_preview',
            service_id=service_id,
            template_id=template_id,
            filetype='png',
            page_count=get_page_count_for_letter(db_template),
        ),
        email_reply_to=email_reply_to,
        sms_sender=sms_sender,
    )

    s3_objects = list_bulk_send_uploads()
    form = SelectCsvFromS3Form(
        choices=[(x.key, x.key) for x in s3_objects],  # (value, label)
        label="Select a file from Amazon S3"
    )

    if form.validate_on_submit():
        try:
            upload_id = copy_bulk_send_file_to_uploads(
                service_id,
                form.s3_files.data,
            )
            return redirect(url_for(
                '.check_messages',
                service_id=service_id,
                upload_id=upload_id,
                template_id=template.id,
                original_file_name=form.s3_files.data,
            ))
        except (UnicodeDecodeError, BadZipFile, XLRDError):
            flash(_('Could not read {}. Try using a different file format.').format(
                form.s3_files.data
            ))
        except (XLDateError):
            flash(_(
                '{} contains numbers or dates that GC Notify can’t understand. '
                'Try formatting all columns as ‘text’ or export your file as CSV.'
            ).format(
                form.s3_files.data
            ))

    column_headings = get_spreadsheet_column_headings_from_template(template)

    return render_template(
        'views/s3-send.html',
        template=template,
        column_headings=list(ascii_uppercase[:len(column_headings)]),
        example=[column_headings, get_example_csv_rows(template)],
        form=form
    )


@main.route("/services/<service_id>/send/<template_id>.csv", methods=['GET'])
@user_has_permissions('send_messages', 'manage_templates')
def get_example_csv(service_id, template_id):
    template = get_template(
        service_api_client.get_service_template(service_id, template_id)['data'], current_service
    )
    return Spreadsheet.from_rows([
        get_spreadsheet_column_headings_from_template(template),
        get_example_csv_rows(template)
    ]).as_csv_data, 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'inline; filename="{}.csv"'.format(template.name)
    }


@main.route("/services/<service_id>/send/<template_id>/set-sender", methods=['GET', 'POST'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def set_sender(service_id, template_id):
    session['sender_id'] = None
    redirect_to_one_off = redirect(
        url_for('.send_one_off', service_id=service_id, template_id=template_id)
    )

    template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    if template['template_type'] == 'letter':
        return redirect_to_one_off

    sender_details = get_sender_details(service_id, template['template_type'])
    if len(sender_details) <= 1:
        return redirect_to_one_off

    sender_context = get_sender_context(sender_details, template['template_type'])

    form = SetSenderForm(
        sender=sender_context['default_id'],
        sender_choices=sender_context['value_and_label'],
        sender_label=sender_context['description']
    )
    option_hints = {sender_context['default_id']: _l('(Default)')}
    if sender_context.get('receives_text_message', None):
        option_hints.update({sender_context['receives_text_message']: _l('(Receives replies)')})
    if sender_context.get('default_and_receives', None):
        option_hints = {sender_context['default_and_receives']: _l('(Default and receives replies)')}

    if form.validate_on_submit():
        session['sender_id'] = form.sender.data
        return redirect(url_for('.send_one_off',
                                service_id=service_id,
                                template_id=template_id))

    return render_template(
        'views/templates/set-sender.html',
        form=form,
        template_id=template_id,
        sender_context={'title': sender_context['title'], 'description': sender_context['description']},
        option_hints=option_hints
    )


def get_sender_context(sender_details, template_type):
    context = {
        'email': {
            'title': _l('Where should replies come back to?'),
            'description': _l('Where should replies come back to?'),
            'field_name': 'email_address'
        },
        'letter': {
            'title': _l('Send to one recipient'),
            'description': _l('What should appear in the top right of the letter?'),
            'field_name': 'contact_block'
        },
        'sms': {
            'title': _l('Who should the message come from?'),
            'description': _l('Who should the message come from?'),
            'field_name': 'sms_sender'
        }
    }[template_type]

    sender_format = context['field_name']

    context['default_id'] = next(sender['id'] for sender in sender_details if sender['is_default'])
    if template_type == 'sms':
        inbound = [sender['id'] for sender in sender_details if sender['inbound_number_id']]
        if inbound:
            context['receives_text_message'] = next(iter(inbound))
        if context['default_id'] == context.get('receives_text_message', None):
            context['default_and_receives'] = context['default_id']

    context['value_and_label'] = [(sender['id'], sender[sender_format]) for sender in sender_details]
    return context


def get_sender_details(service_id, template_type):
    api_call = {
        'email': service_api_client.get_reply_to_email_addresses,
        'letter': service_api_client.get_letter_contacts,
        'sms': service_api_client.get_sms_senders
    }[template_type]
    return api_call(service_id)


@main.route("/services/<service_id>/send/<template_id>/test", endpoint='send_test')
@main.route("/services/<service_id>/send/<template_id>/one-off", endpoint='send_one_off')
@user_has_permissions('send_messages', restrict_admin_usage=True)
def send_test(service_id, template_id):
    session['recipient'] = None
    session['placeholders'] = {}
    session['send_test_letter_page_count'] = None

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)
    if db_template['template_type'] == 'letter':
        session['sender_id'] = None

    if email_or_sms_not_enabled(db_template['template_type'], current_service.permissions):
        return redirect(url_for(
            '.action_blocked',
            service_id=service_id,
            notification_type=db_template['template_type'],
            return_to='view_template',
            template_id=template_id))

    return redirect(url_for(
        {
            'main.send_test': '.send_test_step',
            'main.send_one_off': '.send_one_off_step',
        }[request.endpoint],
        service_id=service_id,
        template_id=template_id,
        step_index=0,
        help=get_help_argument(),
    ))


def get_notification_check_endpoint(service_id, template):
    return redirect(url_for(
        'main.check_notification',
        service_id=service_id,
        template_id=template.id,
        # at check phase we should move to help stage 2 ("the template pulls in the data you provide")
        help='2' if 'help' in request.args else None
    ))


@main.route(
    "/services/<service_id>/send/<template_id>/test/step-<int:step_index>",
    methods=['GET', 'POST'],
    endpoint='send_test_step',
)
@main.route(
    "/services/<service_id>/send/<template_id>/one-off/step-<int:step_index>",
    methods=['GET', 'POST'],
    endpoint='send_one_off_step',
)
@user_has_permissions('send_messages', restrict_admin_usage=True)
def send_test_step(service_id, template_id, step_index):
    if {'recipient', 'placeholders'} - set(session.keys()):
        return redirect(url_for(
            {
                'main.send_test_step': '.send_test',
                'main.send_one_off_step': '.send_one_off',
            }[request.endpoint],
            service_id=service_id,
            template_id=template_id,
        ))

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    if not session.get('send_test_letter_page_count'):
        session['send_test_letter_page_count'] = get_page_count_for_letter(db_template)
    email_reply_to = None
    sms_sender = None
    if db_template['template_type'] == 'email':
        email_reply_to = get_email_reply_to_address_from_session()
    elif db_template['template_type'] == 'sms':
        sms_sender = get_sms_sender_from_session()
    template = get_template(
        db_template,
        current_service,
        show_recipient=True,
        letter_preview_url=url_for(
            '.send_test_preview',
            service_id=service_id,
            template_id=template_id,
            filetype='png',
        ),
        page_count=session['send_test_letter_page_count'],
        email_reply_to=email_reply_to,
        sms_sender=sms_sender,

    )

    placeholders = fields_to_fill_in(
        template,
        prefill_current_user=(request.endpoint == 'main.send_test_step'),
    )

    # used to set the back link in the check_notification screen
    session['send_step'] = request.endpoint

    try:
        current_placeholder = placeholders[step_index]
    except IndexError:
        if all_placeholders_in_session(placeholders):
            return get_notification_check_endpoint(service_id, template)
        return redirect(url_for(
            {
                'main.send_test_step': '.send_test',
                'main.send_one_off_step': '.send_one_off',
            }[request.endpoint],
            service_id=service_id,
            template_id=template_id,
        ))

    optional_placeholder = (current_placeholder in optional_address_columns)
    form = get_placeholder_form_instance(
        current_placeholder,
        dict_to_populate_from=get_normalised_placeholders_from_session(),
        template_type=template.template_type,
        optional_placeholder=optional_placeholder,
        allow_international_phone_numbers=current_service.has_permission('international_sms'),
    )

    if form.validate_on_submit():
        # if it's the first input (phone/email), we store against `recipient` as well, for easier extraction.
        # Only if it's not a letter.
        # And only if we're not on the test route, since that will already have the user's own number set
        if (
            step_index == 0
            and template.template_type != 'letter'
            and request.endpoint != 'main.send_test_step'
        ):
            session['recipient'] = form.placeholder_value.data

        session['placeholders'][current_placeholder] = form.placeholder_value.data

        if all_placeholders_in_session(placeholders):
            return get_notification_check_endpoint(service_id, template)

        return redirect(url_for(
            request.endpoint,
            service_id=service_id,
            template_id=template_id,
            step_index=step_index + 1,
            help=get_help_argument(),
        ))

    back_link = get_back_link(service_id, template, step_index)

    template.values = get_recipient_and_placeholders_from_session(template.template_type)
    template.values[current_placeholder] = None

    if (
        request.endpoint == 'main.send_one_off_step'
        and step_index == 0
        and template.template_type != 'letter'
        and not (template.template_type == 'sms' and current_user.mobile_number is None)
        and current_user.has_permissions('manage_templates', 'manage_service')
    ):

        type = first_column_headings[template.template_type][0]

        if(type == "email address"):
            type = _l("email address")
        elif(type == "phone number"):
            type = _l("phone number")

        skip_link = (
            '{} {}'.format(_l("Use my"), type),
            url_for('.send_test', service_id=service_id, template_id=template.id),
        )
    else:
        skip_link = None
    return render_template(
        'views/send-test.html',
        page_title=get_send_test_page_title(
            template.template_type,
            get_help_argument(),
            entering_recipient=not session['recipient'],
            name=template.name,
        ),
        template=template,
        form=form,
        skip_link=skip_link,
        optional_placeholder=optional_placeholder,
        back_link=back_link,
        help=get_help_argument(),
        link_to_upload=(
            request.endpoint == 'main.send_one_off_step'
            and step_index == 0
        ),
        bulk_send_allowed=service_can_bulk_send(service_id)
    )


@main.route("/services/<service_id>/send/<template_id>/test.<filetype>", methods=['GET'])
@user_has_permissions('send_messages')
def send_test_preview(service_id, template_id, filetype):

    if filetype not in ('pdf', 'png'):
        abort(404)

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    template = get_template(
        db_template,
        current_service,
        letter_preview_url=url_for(
            '.send_test_preview',
            service_id=service_id,
            template_id=template_id,
            filetype='png',
        ),
    )

    template.values = get_normalised_placeholders_from_session()

    return TemplatePreview.from_utils_template(template, filetype, page=request.args.get('page'))


def _check_messages(service_id, template_id, upload_id, preview_row, letters_as_pdf=False):

    try:
        # The happy path is that the job doesn’t already exist, so the
        # API will return a 404 and the client will raise HTTPError.
        job_api_client.get_job(service_id, upload_id)

        # the job exists already - so go back to the templates page
        # If we just return a `redirect` (302) object here, we'll get
        # errors when we try and unpack in the check_messages route.
        # Rasing a werkzeug.routing redirect means that doesn't happen.
        raise PermanentRedirect(url_for(
            '.send_messages',
            service_id=service_id,
            template_id=template_id
        ))
    except HTTPError as e:
        if e.status_code != 404:
            raise

    statistics = service_api_client.get_service_statistics(service_id, today_only=True)
    remaining_messages = (current_service.message_limit - sum(stat['requested'] for stat in statistics.values()))

    contents = s3download(service_id, upload_id)

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    email_reply_to = None
    sms_sender = None
    if db_template['template_type'] == 'email':
        email_reply_to = get_email_reply_to_address_from_session()
    elif db_template['template_type'] == 'sms':
        sms_sender = get_sms_sender_from_session()
    template = get_template(
        db_template,
        current_service,
        show_recipient=True,
        letter_preview_url=url_for(
            '.check_messages_preview',
            service_id=service_id,
            template_id=template_id,
            upload_id=upload_id,
            filetype='png',
            row_index=preview_row,
        ) if not letters_as_pdf else None,
        email_reply_to=email_reply_to,
        sms_sender=sms_sender,
        page_count=get_page_count_for_letter(db_template),
    )
    recipients = RecipientCSV(
        contents,
        template_type=template.template_type,
        placeholders=template.placeholders,
        max_initial_rows_shown=50,
        max_errors_shown=50,
        safelist=itertools.chain.from_iterable(
            [user.name, user.mobile_number, user.email_address] for user in Users(service_id)
        ) if current_service.trial_mode else None,
        remaining_messages=remaining_messages,
        international_sms=current_service.has_permission('international_sms'),
        max_rows=get_csv_max_rows(service_id),
    )

    if request.args.get('from_test'):
        # only happens if generating a letter preview test
        back_link = url_for('.send_test', service_id=service_id, template_id=template.id)
        choose_time_form = None
    else:
        back_link = url_for('.send_messages', service_id=service_id, template_id=template.id)
        choose_time_form = ChooseTimeForm()

    if preview_row < 2:
        abort(404)

    if preview_row < len(recipients) + 2:
        template.values = recipients[preview_row - 2].recipient_and_personalisation
    elif preview_row > 2:
        abort(404)

    return dict(
        recipients=recipients,
        template=template,
        errors=recipients.has_errors,
        row_errors=get_errors_for_csv(recipients, template.template_type),
        count_of_recipients=len(recipients),
        count_of_displayed_recipients=len(list(recipients.displayed_rows)),
        original_file_name=request.args.get('original_file_name', ''),
        upload_id=upload_id,
        form=CsvUploadForm(),
        remaining_messages=remaining_messages,
        choose_time_form=choose_time_form,
        back_link=back_link,
        help=get_help_argument(),
        trying_to_send_letters_in_trial_mode=all((
            current_service.trial_mode,
            template.template_type == 'letter',
        )),
        required_recipient_columns=OrderedSet(recipients.recipient_column_headers) - optional_address_columns,
        preview_row=preview_row,
        sent_previously=job_api_client.has_sent_previously(
            service_id, template.id, db_template['version'], request.args.get('original_file_name', '')
        )
    )


@main.route("/services/<service_id>/<uuid:template_id>/check/<upload_id>", methods=['GET'])
@main.route("/services/<service_id>/<uuid:template_id>/check/<upload_id>/row-<int:row_index>", methods=['GET'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def check_messages(service_id, template_id, upload_id, row_index=2):

    data = _check_messages(service_id, template_id, upload_id, row_index)

    if (
        data['recipients'].too_many_rows or
        not data['count_of_recipients'] or
        not data['recipients'].has_recipient_columns or
        data['recipients'].duplicate_recipient_column_headers or
        data['recipients'].missing_column_headers or
        data['sent_previously']
    ):
        return render_template('views/check/column-errors.html', **data)

    if data['row_errors']:
        return render_template('views/check/row-errors.html', **data)

    if (
        data['errors'] or
        data['trying_to_send_letters_in_trial_mode']
    ):
        return render_template('views/check/column-errors.html', **data)

    data['original_file_name'] = SanitiseASCII.encode(data.get('original_file_name', ''))

    metadata_kwargs = {
        'notification_count': data['count_of_recipients'],
        'template_id': str(template_id),
        'valid': True,
        'original_file_name': unicode_truncate(
            data['original_file_name'],
            1600,
        ),
    }

    if session.get('sender_id'):
        metadata_kwargs['sender_id'] = session['sender_id']

    set_metadata_on_csv_upload(service_id, upload_id, **metadata_kwargs)

    return render_template('views/check/ok.html', **data)


@main.route(
    "/services/<service_id>/<uuid:template_id>/check/<upload_id>.<filetype>",
    methods=['GET'],
)
@main.route(
    "/services/<service_id>/<uuid:template_id>/check/<upload_id>/row-<int:row_index>.<filetype>",
    methods=['GET'],
)
@user_has_permissions('send_messages')
def check_messages_preview(service_id, template_id, upload_id, filetype, row_index=2):
    if filetype == 'pdf':
        page = None
    elif filetype == 'png':
        page = request.args.get('page', 1)
    else:
        abort(404)

    template = _check_messages(
        service_id, template_id, upload_id, row_index, letters_as_pdf=True
    )['template']
    return TemplatePreview.from_utils_template(template, filetype, page=page)


@main.route(
    "/services/<service_id>/<uuid:template_id>/check.<filetype>",
    methods=['GET'],
)
@user_has_permissions('send_messages')
def check_notification_preview(service_id, template_id, filetype):
    if filetype == 'pdf':
        page = None
    elif filetype == 'png':
        page = request.args.get('page', 1)
    else:
        abort(404)

    template = _check_notification(
        service_id, template_id,
    )['template']
    return TemplatePreview.from_utils_template(template, filetype, page=page)


@main.route("/services/<service_id>/start-job/<upload_id>", methods=['POST'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def start_job(service_id, upload_id):

    job_api_client.create_job(
        upload_id,
        service_id,
        scheduled_for=request.form.get('scheduled_for', '')
    )

    session.pop('sender_id', None)

    return redirect(
        url_for(
            'main.view_job',
            job_id=upload_id,
            service_id=service_id,
            help=request.form.get('help'),
            just_sent='yes',
        )
    )


@main.route("/services/<service_id>/end-tour/<example_template_id>")
@user_has_permissions('manage_templates')
def go_to_dashboard_after_tour(service_id, example_template_id):

    service_api_client.delete_service_template(service_id, example_template_id)

    return redirect(
        url_for('main.service_dashboard', service_id=service_id)
    )


def fields_to_fill_in(template, prefill_current_user=False):

    recipient_columns = first_column_headings[template.template_type]

    if 'letter' == template.template_type or not prefill_current_user:
        return recipient_columns + list(template.placeholders)
    if template.template_type == 'sms':
        session['recipient'] = current_user.mobile_number
        session['placeholders']['phone number'] = current_user.mobile_number
    else:
        session['recipient'] = current_user.email_address
        session['placeholders']['email address'] = current_user.email_address

    return list(template.placeholders)


def get_normalised_placeholders_from_session():
    return {
        key: ''.join(value or [])
        for key, value in session.get('placeholders', {}).items()
    }


def get_recipient_and_placeholders_from_session(template_type):
    placeholders = get_normalised_placeholders_from_session()

    if template_type == 'sms':
        placeholders['phone_number'] = session['recipient']
    else:
        placeholders['email_address'] = session['recipient']

    return placeholders


def all_placeholders_in_session(placeholders):
    return all(
        get_normalised_placeholders_from_session().get(placeholder, False) not in (False, None)
        for placeholder in placeholders
    )


def get_send_test_page_title(template_type, help_argument, entering_recipient, name=None):
    if help_argument:
        return _('Example text message')
    if entering_recipient:
        return '{} ‘{}’'.format(_l("Send"), name)
    return _('Personalise this message')


def is_current_user_the_recipient():
    if 'recipient' not in session:
        return False
    if hasattr(current_user, 'mobile_number'):
        return session['recipient'] in {current_user.email_address, current_user.mobile_number}
    return session['recipient'] == current_user.email_address


def get_back_link(service_id, template, step_index):
    if get_help_argument():
        if request.endpoint == 'main.check_notification':
            return url_for(
                'main.send_test',
                service_id=service_id,
                template_id=template.id,
                help=get_help_argument()
            )
        else:
            if step_index == 0:
                return url_for(
                    'main.start_tour',
                    service_id=service_id,
                    template_id=template.id,
                )
            elif step_index > 0:
                return url_for(
                    'main.send_test_step',
                    service_id=service_id,
                    template_id=template.id,
                    step_index=step_index - 1,
                    help=2,
                )
    elif is_current_user_the_recipient() and step_index > 0:
        return url_for(
            'main.send_test_step',
            service_id=service_id,
            template_id=template.id,
            step_index=step_index - 1,
        )
    elif is_current_user_the_recipient() and step_index == 0:
        return url_for(
            'main.send_one_off_step',
            service_id=service_id,
            template_id=template.id,
            step_index=0,
        )
    elif step_index == 0:
        if should_skip_template_page(template.template_type):
            return url_for(
                '.choose_template',
                service_id=service_id,
            )
        else:
            return url_for(
                '.view_template',
                service_id=service_id,
                template_id=template.id,
            )
    else:
        return url_for(
            'main.send_one_off_step',
            service_id=service_id,
            template_id=template.id,
            step_index=step_index - 1,
        )


@main.route("/services/<service_id>/template/<template_id>/notification/check", methods=['GET'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def check_notification(service_id, template_id):
    return render_template(
        'views/notifications/check.html',
        **_check_notification(service_id, template_id),
    )


def _check_notification(service_id, template_id, exception=None):
    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)
    email_reply_to = None
    sms_sender = None
    if db_template['template_type'] == 'email':
        email_reply_to = get_email_reply_to_address_from_session()
    elif db_template['template_type'] == 'sms':
        sms_sender = get_sms_sender_from_session()
    template = get_template(
        db_template,
        current_service,
        show_recipient=True,
        email_reply_to=email_reply_to,
        sms_sender=sms_sender,
        letter_preview_url=url_for(
            '.check_notification_preview',
            service_id=service_id,
            template_id=template_id,
            filetype='png',
        ),
        page_count=get_page_count_for_letter(db_template),
    )

    step_index = len(fields_to_fill_in(template, prefill_current_user=(session.get('send_step') == 'main.send_test_step')))
    back_link = get_back_link(service_id, template, step_index)

    if (
        (
            not session.get('recipient')
            and db_template['template_type'] != 'letter'
        )
        or not all_placeholders_in_session(template.placeholders)
    ):
        raise PermanentRedirect(back_link)

    template.values = get_recipient_and_placeholders_from_session(template.template_type)
    return dict(
        template=template,
        back_link=back_link,
        help=get_help_argument(),
        **(get_template_error_dict(exception) if exception else {}),
    )


def get_template_error_dict(exception):
    # TODO: Make API return some computer-friendly identifier as well as the end user error messages
    if 'service is in trial mode' in exception.message:
        error = 'not-allowed-to-send-to'
    elif 'Exceeded send limits' in exception.message:
        error = 'too-many-messages'
    elif 'Content for template has a character count greater than the limit of' in exception.message:
        error = 'message-too-long'
    else:
        raise exception

    return {
        'error': error,
        'SMS_CHAR_COUNT_LIMIT': SMS_CHAR_COUNT_LIMIT,
        'current_service': current_service,

        # used to trigger CSV specific err msg content, so not needed for single notification errors.
        'original_file_name': False
    }


@main.route("/services/<service_id>/template/<template_id>/notification/check", methods=['POST'])
@user_has_permissions('send_messages', restrict_admin_usage=True)
def send_notification(service_id, template_id):
    if {'recipient', 'placeholders'} - set(session.keys()):
        return redirect(url_for(
            '.send_one_off',
            service_id=service_id,
            template_id=template_id,
        ))

    db_template = current_service.get_template_with_user_permission_or_403(template_id, current_user)

    try:
        noti = notification_api_client.send_notification(
            service_id,
            template_id=db_template['id'],
            recipient=session['recipient'] or session['placeholders']['address line 1'],
            personalisation=session['placeholders'],
            sender_id=session['sender_id'] if 'sender_id' in session else None
        )
    except HTTPError as exception:
        current_app.logger.info('Service {} could not send notification: "{}"'.format(
            current_service.id,
            exception.message
        ))
        return render_template(
            'views/notifications/check.html',
            **_check_notification(service_id, template_id, exception),
        )

    session.pop('placeholders')
    session.pop('recipient')
    session.pop('sender_id', None)

    return redirect(url_for(
        '.view_notification',
        service_id=service_id,
        notification_id=noti['id'],
        help=request.args.get('help')
    ))


def get_email_reply_to_address_from_session():
    if session.get('sender_id'):
        return current_service.get_email_reply_to_address(
            session['sender_id']
        )['email_address']


def get_sms_sender_from_session():
    if session.get('sender_id'):
        return current_service.get_sms_sender(
            session['sender_id']
        )['sms_sender']


def get_spreadsheet_column_headings_from_template(template):
    column_headings = []

    for column_heading in (
        first_column_headings[template.template_type] + list(template.placeholders)
    ):
        if column_heading not in Columns.from_keys(column_headings):
            column_headings.append(column_heading)

    return column_headings
