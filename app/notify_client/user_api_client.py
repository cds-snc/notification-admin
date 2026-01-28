import hashlib
import os
from contextlib import suppress
from datetime import datetime, timedelta
from typing import Dict

from notifications_python_client.errors import HTTPError

from app.extensions import redis_client
from app.models.roles_and_permissions import (
    translate_permissions_from_admin_roles_to_db,
)
from app.notify_client import NotifyAdminAPIClient, cache

ALLOWED_ATTRIBUTES = {
    "name",
    "email_address",
    "mobile_number",
    "auth_type",
    "verified_phonenumber",
    "updated_by",
    "blocked",
    "password_expired",
    "default_editor_is_rte",
}


class UserApiClient(NotifyAdminAPIClient):
    def init_app(self, app):
        super().init_app(app)
        self.admin_url = app.config["ADMIN_BASE_URL"]
        self.contact_email = app.config["CONTACT_EMAIL"]
        self.notify_user_id = app.config["NOTIFY_USER_ID"]
        self.notify_service_id = app.config["NOTIFY_SERVICE_ID"]

    def register_user(self, name, email_address, mobile_number, password, auth_type):
        password = self._create_message_digest(password)
        data = {
            "name": name,
            "email_address": email_address,
            "mobile_number": mobile_number,
            "password": password,
            "auth_type": auth_type,
        }
        user_data = self.post("/user", data)
        return user_data["data"]

    def get_user(self, user_id):
        return self._get_user(user_id)["data"]

    @cache.set("user-{user_id}")
    def _get_user(self, user_id):
        return self.get("/user/{}".format(user_id))

    def get_user_by_email(self, email_address):
        user_data = self.get("/user/email", params={"email": email_address})
        return user_data["data"]

    def get_user_by_email_or_none(self, email_address):
        try:
            return self.get_user_by_email(email_address)
        except HTTPError as e:
            if e.status_code == 404:
                return None
            raise e

    @cache.delete("user-{user_id}")
    def update_user_attribute(self, user_id, **kwargs):
        data = dict(kwargs)
        disallowed_attributes = set(data.keys()) - ALLOWED_ATTRIBUTES
        if disallowed_attributes:
            raise TypeError("Not allowed to update user attributes: {}".format(", ".join(disallowed_attributes)))

        url = "/user/{}".format(user_id)
        user_data = self.post(url, data=data)
        return user_data["data"]

    @cache.delete("user-{user_id}")
    def archive_user(self, user_id):
        return self.post("/user/{}/archive".format(user_id), data=None)

    @cache.delete("user-{user_id}")
    def reset_failed_login_count(self, user_id):
        url = "/user/{}/reset-failed-login-count".format(user_id)
        user_data = self.post(url, data={})
        return user_data["data"]

    @cache.delete("user-{user_id}")
    def update_password(self, user_id, password, login_data={}):
        password = self._create_message_digest(password)
        data = {"_password": password, "loginData": login_data}
        url = "/user/{}/update-password".format(user_id)
        user_data = self.post(url, data=data)
        return user_data["data"]

    @cache.delete("user-{user_id}")
    def verify_password(self, user_id, password, login_data={}):
        try:
            password = self._create_message_digest(password)
            url = "/user/{}/verify/password".format(user_id)
            data = {"password": password, "loginData": login_data}
            self.post(url, data=data)
            return True
        except HTTPError as e:
            if e.status_code == 400 or e.status_code == 404:
                return False

    def find_ids(self, ids):
        return self.get("/support/find-ids", params={"ids": ids})

    def send_verify_code(self, user_id, code_type, to, next_string=None):
        data = {"to": to}
        if next_string:
            data["next"] = next_string
        if code_type == "email":
            data["email_auth_link_host"] = self.admin_url
            self.register_last_email_login_datetime(user_id)
        endpoint = "/user/{0}/{1}-code".format(user_id, code_type)
        self.post(endpoint, data=data)

    def send_verify_email(self, user_id, to):
        data = {"to": to}
        endpoint = "/user/{0}/email-verification".format(user_id)
        self.post(endpoint, data=data)

    def send_already_registered_email(self, user_id, to):
        data = {"email": to}
        endpoint = "/user/{0}/email-already-registered".format(user_id)
        self.post(endpoint, data=data)

    def send_contact_request(self, data: Dict[str, str]):
        endpoint = f"/user/{self.notify_user_id}/contact-request"
        self.post(endpoint, data=data)

    def send_branding_request(
        self, user_id, serviceID, service_name, org_id, org_name, filename, alt_text_en, alt_text_fr, branding_logo_name=None
    ):
        data = {
            "email": self.contact_email,
            "serviceID": serviceID,
            "service_name": service_name,
            "organisation_id": org_id,
            "organisation_name": org_name,
            "filename": filename,
            "alt_text_en": alt_text_en,
            "alt_text_fr": alt_text_fr,
            "branding_logo_name": branding_logo_name,
        }
        endpoint = "/user/{0}/branding-request".format(user_id)
        self.post(endpoint, data=data)

    def send_new_template_category_request(
        self, user_id, service_id, template_category_name_en, template_category_name_fr, template_id
    ):
        data = {
            "service_id": service_id,
            "template_category_name_en": template_category_name_en,
            "template_category_name_fr": template_category_name_fr,
            "template_id": template_id,
        }
        endpoint = "/user/{0}/new-template-category-request".format(user_id)
        self.post(endpoint, data=data)

    @cache.delete("user-{user_id}")
    def check_verify_code(self, user_id, code, code_type):
        data = {"code_type": code_type, "code": code}
        endpoint = "/user/{}/verify/code".format(user_id)
        try:
            self.post(endpoint, data=data)
            return True, ""
        except HTTPError as e:
            if e.status_code == 400 or e.status_code == 404:
                return False, e.message
            raise e

    def validate_2fa_method(self, user_id, code, code_type):
        data = {"code_type": code_type, "code": code}
        endpoint = "/user/{}/verify-2fa".format(user_id)
        try:
            self.post(endpoint, data=data)
            return True, ""
        except HTTPError as e:
            if e.status_code == 400 or e.status_code == 404:
                return False, e.message
            raise e

    def get_users_for_service(self, service_id):
        endpoint = "/service/{}/users".format(service_id)
        return self.get(endpoint)["data"]

    def get_users_for_organisation(self, org_id):
        endpoint = "/organisations/{}/users".format(org_id)
        return self.get(endpoint)["data"]

    @cache.delete("service-{service_id}")
    @cache.delete("service-{service_id}-template-folders")
    @cache.delete("user-{user_id}")
    def add_user_to_service(self, service_id, user_id, permissions, folder_permissions):
        # permissions passed in are the combined admin roles, not db permissions
        endpoint = "/service/{}/users/{}".format(service_id, user_id)
        data = {
            "permissions": [{"permission": x} for x in translate_permissions_from_admin_roles_to_db(permissions)],
            "folder_permissions": folder_permissions,
        }

        self.post(endpoint, data=data)

    @cache.delete("user-{user_id}")
    def add_user_to_organisation(self, org_id, user_id):
        resp = self.post("/organisations/{}/users/{}".format(org_id, user_id), data={})
        return resp["data"]

    @cache.delete("service-{service_id}-template-folders")
    @cache.delete("user-{user_id}")
    def set_user_permissions(self, user_id, service_id, permissions, folder_permissions=None):
        # permissions passed in are the combined admin roles, not db permissions
        data = {
            "permissions": [{"permission": x} for x in translate_permissions_from_admin_roles_to_db(permissions)],
        }

        if folder_permissions is not None:
            data["folder_permissions"] = folder_permissions

        endpoint = "/user/{}/service/{}/permission".format(user_id, service_id)
        self.post(endpoint, data=data)

    def send_reset_password_url(self, email_address):
        endpoint = "/user/reset-password"
        data = {"email": email_address}
        self.post(endpoint, data=data)

    def send_forced_reset_password_url(self, email_address):
        endpoint = "/user/forced-password-reset"
        data = {"email": email_address}
        self.post(endpoint, data=data)

    def find_users_by_full_or_partial_email(self, email_address):
        endpoint = "/user/find-users-by-email"
        data = {"email": email_address}
        users = self.post(endpoint, data=data)
        return users

    @cache.delete("user-{user_id}")
    def activate_user(self, user_id):
        return self.post("/user/{}/activate".format(user_id), data=None)

    def send_change_email_verification(self, user_id, new_email):
        endpoint = "/user/{}/change-email-verification".format(user_id)
        data = {"email": new_email}
        self.post(endpoint, data)

    def get_organisations_and_services_for_user(self, user_id):
        endpoint = "/user/{}/organisations-and-services".format(user_id)
        return self.get(endpoint)

    def get_security_keys_for_user(self, user_id):
        endpoint = "/user/{}/fido2_keys".format(user_id)
        return self.get(endpoint)

    def register_security_key(self, user_id):
        endpoint = "/user/{}/fido2_keys/register".format(user_id)
        return self.post(endpoint, {})

    def add_security_key_user(self, user_id, payload):
        endpoint = "/user/{}/fido2_keys".format(user_id)
        data = {"payload": payload}
        return self.post(endpoint, data)

    def delete_security_key_user(self, user_id, key):
        endpoint = "/user/{}/fido2_keys/{}".format(user_id, key)
        return self.delete(endpoint)

    def authenticate_security_keys(self, user_id):
        endpoint = "/user/{}/fido2_keys/authenticate".format(user_id)
        return self.post(endpoint, {})

    @cache.delete("user-{user_id}")
    def validate_security_keys(self, user_id, payload):
        endpoint = "/user/{}/fido2_keys/validate".format(user_id)
        data = {"payload": payload}
        return self.post(endpoint, data)

    def get_login_events_for_user(self, user_id):
        endpoint = "/user/{}/login_events".format(user_id)
        return self.get(endpoint)

    def register_last_email_login_datetime(self, user_id):
        redis_client.set(
            self._last_email_login_key_name(user_id),
            datetime.utcnow().isoformat(),
            ex=int(timedelta(days=30).total_seconds()),
        )

    def get_last_email_login_datetime(self, user_id):
        value = redis_client.get(self._last_email_login_key_name(user_id))
        if value is None:
            return None
        if isinstance(value, bytes):
            value = value.decode("utf-8")
        return datetime.fromisoformat(value)

    def _last_email_login_key_name(self, user_id):
        return f"user-{user_id}-last-email-login"

    def _create_message_digest(self, password):
        return hashlib.sha256((password + os.getenv("DANGEROUS_SALT")).encode("utf-8")).hexdigest()

    @cache.delete("user-{user_id}")
    def deactivate_user(self, user_id):
        """This function sends an api request to deactivate a user account. The API suspends
        services that now have 1 member and deactivates services that now have 0 members.
        We delete certain redis data so that these service changes are visible immediately
        """

        endpoint = f"/user/{user_id}/deactivate"
        api_response = self.post(endpoint, {})

        # try to get the list of services that were affected by the deactivate call
        service_ids = []
        try:
            # preferred: backend includes explicit list of suspended services
            if isinstance(api_response, dict):
                data = api_response.get("data") or api_response
                if isinstance(data, dict) and data.get("services_suspended"):
                    service_ids = data.get("services_suspended") or []

            # fallback: query organisations and services for the user
            if not service_ids:
                try:
                    orgs_and_services = self.get_organisations_and_services_for_user(user_id)
                    if orgs_and_services and orgs_and_services.get("data"):
                        for org in orgs_and_services["data"]:
                            for service in org.get("services", []):
                                sid = service.get("id")
                                if sid:
                                    service_ids.append(sid)
                except Exception:
                    # don't fail suspend if the lookup fails; best-effort cache invalidation
                    service_ids = []

            # delete related cache keys for affected services
            for sid in set(service_ids):
                try:
                    # delete specific known keys
                    redis_client.delete(
                        f"service-{sid}",
                        f"service-{sid}-templates",
                        f"service-{sid}-template-folders",
                        f"service-{sid}-data-retention",
                    )
                except Exception:
                    # if delete of specific keys fails, try pattern delete as a fallback
                    with suppress(Exception):
                        redis_client.delete_cache_keys_by_pattern(f"service-{sid}*")
        except Exception:
            # anything went wrong in the cache invalidation path - don't block the suspend
            pass

        return api_response


user_api_client = UserApiClient()
