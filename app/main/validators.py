import ipaddress
import re
import time
from urllib.parse import urlparse

import pwnedpasswords
import requests
import validators
from flask import current_app, g
from flask_babel import _
from flask_babel import lazy_gettext as _l
from notifications_utils.field import Field
from notifications_utils.recipients import InvalidEmailError, validate_email_address
from notifications_utils.sanitise_text import SanitiseSMS
from wtforms import ValidationError
from wtforms.validators import Email

from app import current_service, formatted_list, service_api_client
from app.main._blocked_passwords import blocked_passwords
from app.utils import Spreadsheet, email_address_ends_with, email_safe, email_safe_name, is_gov_user


class Blocklist:
    def __init__(self, message=None):
        if not message:
            message = _("This password is not allowed. Try a different password.")
        self.message = message

    def __call__(self, form, field):
        if current_app.config.get("HIPB_ENABLED", None):
            hibp_bad_password_found = False
            # Try 3 times. If the HIPB API is down then fall back to the old banlist.
            for i in range(0, 3):
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
    def __init__(self, message=_("Not a csv file")):
        self.message = message

    def __call__(self, form, field):
        if not Spreadsheet.can_handle(field.data.filename):
            raise ValidationError(
                "{} {}".format(
                    field.data.filename,
                    _("is not a spreadsheet that GC Notify can read"),
                )
            )


class ValidTeamMemberDomain:
    def __call__(self, form, field):
        if not field.data:
            return
        email_domain = field.data.split("@")[-1]
        # Merge domains from team members and safelisted domains, use set to ensure no duplicates
        safelisted_domains = set(current_app.config.get("REPLY_TO_DOMAINS_SAFELIST", set()))
        valid_domains = g.team_member_email_domains.union(safelisted_domains)

        # Allow the domain if it's in valid_domains OR if it ends with gc.ca
        if email_domain not in valid_domains and not email_domain.endswith(".gc.ca"):
            safelist_domains_to_display = ["canada.ca", "*.gc.ca"]
            safelist_domains_to_display.extend(g.team_member_email_domains)
            message = _("{} is not a government or team email address</br>Use one of the following domains:</br>{}").format(
                email_domain.replace("%", "%%"), "<br>".join([f"@{domain}" for domain in safelist_domains_to_display])
            )

            raise ValidationError(message)


class ValidGovEmail:
    def __call__(self, form, field):
        if not field.data:
            return

        # extract domain name from given email address

        domain = re.search(r"@(.*)$", field.data)

        if domain:
            domain = domain.group(1)
        else:
            domain = ""

        contact_text = _("contact us")
        message = _("{} is not on our list of government domains. If it’s a government email address, {}.").format(
            domain.replace("%", "%%"), contact_text
        )
        if email_address_ends_with(field.data.lower(), current_app.config.get("BLOCKED_SIGNUP_EMAIL_DOMAINS", [])):
            raise ValidationError(message)
        if not is_gov_user(field.data.lower()):
            raise ValidationError(message)


class ValidEmail(Email):
    def __init__(self):
        super().__init__(_l("Enter a valid email address"))

    def __call__(self, form, field):
        if not field.data:
            return

        try:
            validate_email_address(field.data)
        except InvalidEmailError:
            raise ValidationError(_l(self.message))


class NoCommasInPlaceHolders:
    def __init__(self, message=_("You cannot put commas between double brackets")):
        self.message = message

    def __call__(self, form, field):
        if "," in "".join(Field(field.data).placeholders):
            raise ValidationError(self.message)


class OnlySMSCharacters:
    def __call__(self, form, field):
        non_sms_characters = sorted(list(SanitiseSMS.get_non_compatible_characters(field.data)))
        if non_sms_characters:
            raise ValidationError(
                "You can’t use {} in text messages. {} won’t show up properly on everyone’s phones.".format(
                    formatted_list(
                        non_sms_characters,
                        conjunction="or",
                        before_each="",
                        after_each="",
                    ),
                    ("It" if len(non_sms_characters) == 1 else "They"),
                )
            )


class LettersNumbersAndFullStopsOnly:
    regex = re.compile(r"^[a-zA-Z0-9\s\.]+$")

    def __init__(self, message="Use letters and numbers only"):
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


class ValidCallbackUrl:
    def __init__(self, message="Enter a URL that starts with https://"):
        self.message = message

    def __call__(self, form, field):
        if field.data:
            validate_callback_url(field.data, form.bearer_token.data)


def _is_localhost_url(url):
    """Check if a URL references localhost or a loopback address."""
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").rstrip(".")
        if hostname == "localhost" or hostname.endswith(".localhost"):
            return True
        try:
            return ipaddress.ip_address(hostname).is_loopback
        except ValueError:
            return False
    except Exception:
        return False


def validate_callback_url(service_callback_url, bearer_token):
    """Validates a callback URL, checking that it is https and by sending a POST request to the URL with a health_check parameter.
    4xx responses are considered invalid. 5xx responses are considered valid as it indicates there is at least a service running
    at the URL, and we are sending a payload that the service will not understand.

    Args:
        service_callback_url (str): The url to validate.
        bearer_token (str): The bearer token to use in the request, specified by the user requesting callbacks.

    Raises:
        ValidationError: If the URL is not HTTPS or the http response is 4xx.
    """
    if _is_localhost_url(service_callback_url):
        current_app.logger.warning(
            f"Unable to create callback for service: {current_service.id}. Error: Localhost callback URLs are not allowed: URL: {service_callback_url}"
        )
        raise ValidationError(_l("Enter a public URL. Localhost URLs cannot be used for callbacks."))

    if not validators.url(service_callback_url):
        current_app.logger.warning(
            f"Unable to create callback for service: {current_service.id}. Error: Invalid callback URL format: URL: {service_callback_url}"
        )
        raise ValidationError(_l("Enter a URL that starts with https://"))

    try:
        response = requests.post(
            url=service_callback_url,
            allow_redirects=True,
            json={"health_check": True},
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {bearer_token}"},
            timeout=2,
        )

        g.callback_response_time = response.elapsed.total_seconds()

        if response.status_code < 500 and response.status_code >= 400:
            current_app.logger.warning(
                f"Unable to create callback for service: {current_service.id} Error: Callback URL not reachable URL: {service_callback_url} Response Code: {response.status_code}"
            )
            raise ValidationError(
                _l("Check your service is running and not using a proxy we cannot access. Received {} response").format(
                    response.status_code
                )
            )

    except requests.RequestException as e:
        current_app.logger.warning(
            f"Unable to create callback for service: {current_service.id} Error: Callback URL not reachable URL: {service_callback_url} Exception: {e}"
        )
        raise ValidationError(
            _l("Check your service is running and not using a proxy we cannot access. Received {} response").format(
                getattr(e.response, "status_code", "unknown")
            )
        )


def validate_email_from(form, field):
    if email_safe(field.data) != field.data.lower():
        # fix their data instead of only warning them
        field.data = email_safe(field.data)
    if len(field.data) == 0:
        # the field became empty after sanitisation
        raise ValidationError(_l("This cannot be empty"))
    if len(field.data) > 64:
        raise ValidationError(_l("This cannot exceed 64 characters in length"))
    # this filler is used because service id is not available when validating a new service to be created
    service_id = getattr(form, "service_id", current_app.config["NOTIFY_BAD_FILLER_UUID"])
    unique_name = service_api_client.is_service_email_from_unique(service_id, field.data)
    if not unique_name:
        raise ValidationError(_l("This email address is already in use"))


def validate_service_name(form, field):
    if len(field.data) > 255:
        raise ValidationError(_l("This cannot exceed 255 characters in length"))
    if field.data != email_safe_name(field.data):
        raise ValidationError(_l("Make sure we formatted your email address correctly."))
    service_id = getattr(form, "service_id", current_app.config["NOTIFY_BAD_FILLER_UUID"])
    unique_name = service_api_client.is_service_name_unique(
        service_id,
        field.data,
    )
    if not unique_name:
        raise ValidationError(_l("This service name is already in use"))


def validate_combined_email_header_length(form, field):
    """
    Validate that the From header the API will send to SES (service name + email address + sending
    domain) doesn't exceed MAX_FROM_HEADER_LENGTH characters.

    The error is specific to the field being validated: the name field says how many characters to
    remove from the name, and the email_from field says how many to remove from the email address.
    """
    # At least one of name or email_from must be on the form for this
    # validator to be meaningful.
    if not hasattr(form, "name") and not hasattr(form, "email_from"):
        return

    if hasattr(form, "name"):
        service_name = form.name.data if form.name.data else ""
    else:
        service_name = getattr(current_service, "name", "") or ""

    # If the form does not include an email_from field (e.g. when renaming an
    # existing service), fall back to the current service's email_from so we
    # still validate the combined header length when only the name is being
    # edited.
    if hasattr(form, "email_from"):
        email_from = form.email_from.data if form.email_from.data else ""
    else:
        email_from = getattr(current_service, "email_from", "") or ""

    # If either field is empty, skip this validation (let other validators handle it)
    if not service_name or not email_from:
        return

    sending_domain = get_effective_sending_domain()
    if not is_from_header_too_long(service_name, email_from, sending_domain):
        return

    if field.name == "email_from":
        raise ValidationError(_from_header_too_long_email_from_message(service_name, email_from, sending_domain))
    raise ValidationError(_from_header_too_long_name_message(service_name, email_from, sending_domain))


def validate_sending_domain_fits_from_header(form, field):
    """
    Validate that the current service's name and email address still fit in the From header
    when the service is switched to the selected sending domain.
    """
    service_name = getattr(current_service, "name", "") or ""
    email_from = getattr(current_service, "email_from", "") or ""
    if not field.data or not service_name or not email_from:
        return
    if not is_from_header_too_long(service_name, email_from, field.data):
        return

    name_chars = characters_to_remove_from_name(service_name, email_from, field.data)
    email_chars = characters_to_remove_from_email_from(service_name, email_from, field.data)
    if name_chars is not None and email_chars is not None:
        raise ValidationError(
            _l(
                "The service name and email address are too long to use with this sending domain. "
                "Remove {} characters from the service name, or {} characters from the email address."
            ).format(name_chars, email_chars)
        )
    if name_chars is not None:
        raise ValidationError(
            _l(
                "The service name and email address are too long to use with this sending domain. "
                "Remove {} characters from the service name."
            ).format(name_chars)
        )
    if email_chars is None:
        raise ValidationError(_l("Your service name and email address are too long together. Shorten the email address."))
    raise ValidationError(
        _l(
            "The service name and email address are too long to use with this sending domain. "
            "Remove {} characters from the email address."
        ).format(email_chars)
    )


# AWS SES rejects a From header (Source) longer than this.
MAX_FROM_HEADER_LENGTH = 320
MAX_SERVICE_NAME_LENGTH = 255
MAX_EMAIL_FROM_LENGTH = 64
# The API sends the From header as '"=?utf-8?B?<base64 service name>?=" <email_from@sending_domain>'.
# See get_from_address in notification-api app/delivery/send_to_providers.py.
_ENCODED_NAME_PREFIX = '"=?utf-8?B?'
_ENCODED_NAME_SUFFIX = '?=" <'


def get_effective_sending_domain():
    return getattr(current_service, "sending_domain", None) or current_app.config["SENDING_DOMAIN"]


def _encoded_name_length(name_bytes: int) -> int:
    return 4 * -(-name_bytes // 3)  # base64 length: 4 characters per 3 bytes, rounded up


def _from_header_length_without_name(email_from: str, sending_domain: str) -> int:
    return len(_ENCODED_NAME_PREFIX) + len(_ENCODED_NAME_SUFFIX) + len(email_from) + 1 + len(sending_domain) + 1


def get_from_header_length(service_name: str, email_from: str, sending_domain: str) -> int:
    """Length of the From header exactly as the API builds it."""
    name_bytes = len(service_name.encode("utf-8"))
    return _encoded_name_length(name_bytes) + _from_header_length_without_name(email_from, sending_domain)


def is_from_header_too_long(service_name: str, email_from: str, sending_domain: str) -> bool:
    return get_from_header_length(service_name, email_from, sending_domain) > MAX_FROM_HEADER_LENGTH


def _max_name_bytes(email_from: str, sending_domain: str) -> int:
    room_for_encoded_name = MAX_FROM_HEADER_LENGTH - _from_header_length_without_name(email_from, sending_domain)
    return max((room_for_encoded_name // 4) * 3, 0)


def get_max_service_name_length(email_from: str, sending_domain: str) -> int:
    """Longest service name (in characters without accents) that fits with this email address and domain."""
    return min(MAX_SERVICE_NAME_LENGTH, _max_name_bytes(email_from, sending_domain))


def get_max_email_from_length(service_name: str, sending_domain: str) -> int:
    """Longest email address (part before the @) that fits with this service name and domain."""
    room = MAX_FROM_HEADER_LENGTH - get_from_header_length(service_name, "", sending_domain)
    return max(min(MAX_EMAIL_FROM_LENGTH, room), 0)


def characters_to_remove_from_name(service_name: str, email_from: str, sending_domain: str):
    """
    Exact number of characters to remove from the service name so the From header fits, counting
    letters with accents (2 bytes in UTF-8) as 2. Removing that many plain characters (or fewer
    accented ones) is guaranteed to be enough. Returns None if shortening the name can't fix it.
    """
    max_name_bytes = _max_name_bytes(email_from, sending_domain)
    if max_name_bytes <= 0:
        return None
    return max(len(service_name.encode("utf-8")) - max_name_bytes, 0)


def characters_to_remove_from_email_from(service_name: str, email_from: str, sending_domain: str):
    """
    Exact number of characters to remove from the email address so the From header fits.
    Returns None if shortening the email address can't fix it.
    """
    overflow = get_from_header_length(service_name, email_from, sending_domain) - MAX_FROM_HEADER_LENGTH
    if overflow >= len(email_from):
        return None
    return max(overflow, 0)


def _from_header_too_long_name_message(service_name, email_from, sending_domain):
    name_chars = characters_to_remove_from_name(service_name, email_from, sending_domain)
    if name_chars is None:
        return _l("Your service name and email address are too long together. Shorten the email address.")
    return _l(
        "Your service name and email address are too long together. Remove {} characters from the service name. "
        "Letters with accents, like é, count as 2 characters."
    ).format(name_chars)


def _from_header_too_long_email_from_message(service_name, email_from, sending_domain):
    email_chars = characters_to_remove_from_email_from(service_name, email_from, sending_domain)
    if email_chars is None:
        return _from_header_too_long_name_message(service_name, email_from, sending_domain)
    return _l("Your service name and email address are too long together. Remove {} characters from the email address.").format(
        email_chars
    )
