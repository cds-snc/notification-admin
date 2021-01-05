import re
import time

import pwnedpasswords
from flask import current_app
from flask_babel import _
from flask_babel import lazy_gettext as _l
from notifications_utils.field import Field
from notifications_utils.recipients import (
    InvalidEmailError,
    validate_email_address,
)
from notifications_utils.sanitise_text import SanitiseSMS
from wtforms import ValidationError
from wtforms.validators import Email

from app import formatted_list, service_api_client
from app.main._blocked_passwords import blocked_passwords
from app.utils import Spreadsheet, email_safe, email_safe_name, is_gov_user


class Blocklist:
    def __init__(self, message=None):
        if not message:
            message = _('This password is not allowed. Try a different password.')
        self.message = message

    def __call__(self, form, field):
        if current_app.config.get('HIPB_ENABLED', None):
            hibp_bad_password_found = False
            for i in range(0, 3):  # Try 3 times. If the HIPB API is down then fall back to the old banlist.
                try:
                    response = pwnedpasswords.check(field.data)
                    if response > 0:
                        hibp_bad_password_found = True
                        break
                    elif response == 0:
                        return

                except Exception:
                    time.sleep(0.5)
                    pass

            if hibp_bad_password_found:
                raise ValidationError(self.message)

        if field.data in blocked_passwords:
            raise ValidationError(self.message)


class CsvFileValidator:

    def __init__(self, message=_('Not a csv file')):
        self.message = message

    def __call__(self, form, field):
        if not Spreadsheet.can_handle(field.data.filename):
            raise ValidationError("{} {}".format(field.data.filename, _("is not a spreadsheet that GC Notify can read")))


class ValidGovEmail:

    def __call__(self, form, field):

        if field.data == '':
            return

        from flask import url_for

        gov_email = _("Enter a government email address.")
        contact_url = url_for('.contact')
        access_text = _("If you think you should have access")
        contact_text = _('contact us')

        message = ('{} {} <a href="{}">{}</a>').format(gov_email, access_text, contact_url, contact_text)
        if not is_gov_user(field.data.lower()):
            raise ValidationError(message)


class ValidEmail(Email):

    def __init__(self):
        super().__init__(_l('Enter a valid email address'))

    def __call__(self, form, field):

        if field.data == '':
            return

        try:
            validate_email_address(field.data)
        except InvalidEmailError:
            raise ValidationError(_l(self.message))


class NoCommasInPlaceHolders:

    def __init__(self, message=_('You cannot put commas between double brackets')):
        self.message = message

    def __call__(self, form, field):
        if ',' in ''.join(Field(field.data).placeholders):
            raise ValidationError(self.message)


class OnlySMSCharacters:
    def __call__(self, form, field):
        non_sms_characters = sorted(list(SanitiseSMS.get_non_compatible_characters(field.data)))
        if non_sms_characters:
            raise ValidationError(
                'You can’t use {} in text messages. {} won’t show up properly on everyone’s phones.'.format(
                    formatted_list(non_sms_characters, conjunction='or', before_each='', after_each=''),
                    ('It' if len(non_sms_characters) == 1 else 'They')
                )
            )


class LettersNumbersAndFullStopsOnly:

    regex = re.compile(r'^[a-zA-Z0-9\s\.]+$')

    def __init__(self, message='Use letters and numbers only'):
        self.message = message

    def __call__(self, form, field):
        if field.data and not re.match(self.regex, field.data):
            raise ValidationError(self.message)


class DoesNotStartWithDoubleZero:

    def __init__(self, message="Can't start with 00"):
        self.message = message

    def __call__(self, form, field):
        if field.data and field.data.startswith("00"):
            raise ValidationError(self.message)


def validate_email_from(form, field):
    if email_safe(field.data) != field.data.lower():
        raise ValidationError(_l('This entry must contain valid characters for an email address.'))
    if len(field.data) > 64:
        raise ValidationError(_l('This cannot exceed 64 characters in length'))
    # this filler is used because service id is not available when validating a new service to be created
    service_id = getattr(form, 'service_id', current_app.config['NOTIFY_BAD_FILLER_UUID'])
    unique_name = service_api_client.is_service_email_from_unique(
        service_id,
        field.data
    )
    if not unique_name:
        raise ValidationError(_l("This email address is already in use"))


def validate_name(form, field):
    if len(field.data) > 255:
        raise ValidationError(_l('This cannot exceed 255 characters in length'))
    if field.data != email_safe_name(field.data):
        raise ValidationError(_l('This entry must contain valid characters for an email address.'))
    unique_name = service_api_client.is_service_name_unique(
        field.data,
    )
    if not unique_name:
        raise ValidationError(_l("This service name is already in use"))
