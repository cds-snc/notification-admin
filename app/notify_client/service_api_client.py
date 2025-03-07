import json
from datetime import datetime, timedelta, timezone

from flask import current_app
from flask_login import current_user

from app.extensions import redis_client
from app.notify_client import NotifyAdminAPIClient, _attach_current_user, cache


def _seconds_until_midnight():
    now = datetime.now(timezone.utc)
    midnight = datetime.combine(now + timedelta(days=1), datetime.min.time())
    return int((midnight - now).total_seconds())


class ServiceAPIClient(NotifyAdminAPIClient):
    @cache.delete("user-{user_id}")
    def create_service(
        self,
        service_name,
        organisation_type,
        message_limit,
        sms_daily_limit,
        restricted,
        user_id,
        email_from,
        default_branding_is_french,
        organisation_notes="",
    ) -> str:
        """
        Create a service and return the json.
        """
        data = {
            "name": service_name,
            "organisation_type": organisation_type,
            "active": True,
            "message_limit": message_limit,
            "sms_daily_limit": sms_daily_limit,
            "user_id": user_id,
            "restricted": restricted,
            "email_from": email_from,
            "default_branding_is_french": default_branding_is_french,
            "organisation_notes": organisation_notes,
        }
        data = _attach_current_user(data)
        return self.post("/service", data)["data"]["id"]

    @cache.set("service-{service_id}")
    def get_service(self, service_id):
        """
        Retrieve a service.
        """
        return self.get("/service/{0}".format(service_id))

    def get_service_statistics(self, service_id, today_only, limit_days=None):
        return self.get(
            "/service/{0}/statistics".format(service_id),
            params={"today_only": today_only, "limit_days": limit_days},
        )["data"]

    def get_services(self, params_dict=None):
        """
        Retrieve a list of services.
        """
        return self.get("/service", params=params_dict)

    def get_stats_by_month(self, filter_heartbeats=False):
        """
        Retrieve notifications stats by month.
        """
        return self.get("/service/delivered-notifications-stats-by-month-data", params={"filter_heartbeats": filter_heartbeats})

    def find_services_by_name(self, service_name):
        return self.get("/service/find-services-by-name", params={"service_name": service_name})

    def get_live_services_data(self, params_dict=None):
        """
        Retrieve a list of live services data with contact names and notification counts.
        """
        return self.get("/service/live-services-data", params=params_dict)

    def get_active_services(self, params_dict=None):
        """
        Retrieve a list of active services.
        """
        params_dict["only_active"] = True
        return self.get_services(params_dict)

    @cache.delete("service-{service_id}")
    def update_service(self, service_id, **kwargs):
        """
        Update a service.
        """
        data = _attach_current_user(kwargs)
        disallowed_attributes = set(data.keys()) - {
            # this list is the ALLOWED attributes - anything not in this list will be disallowed
            "name",
            "message_limit",
            "sms_daily_limit",
            "active",
            "restricted",
            "email_from",
            "reply_to_email_address",
            "research_mode",
            "sms_sender",
            "created_by",
            "letter_branding",
            "email_branding",
            "default_branding_is_french",
            "letter_contact_block",
            "permissions",
            "organisation_type",
            "free_sms_fragment_limit",
            "prefix_sms",
            "contact_link",
            "volume_email",
            "volume_sms",
            "volume_letter",
            "consent_to_research",
            "count_as_live",
            "go_live_user",
            "go_live_at",
            "sending_domain",
            "sms_volume_today",
            "sensitive_service",
            "email_annual_limit",
            "sms_annual_limit",
        }

        if disallowed_attributes:
            raise TypeError("Not allowed to update service attributes: {}".format(", ".join(disallowed_attributes)))

        endpoint = "/service/{0}".format(service_id)
        return self.post(endpoint, data)

    @cache.delete("live-service-and-organisation-counts")
    @cache.delete("organisations")
    def update_status(self, service_id, live, message_limit, sms_daily_limit):
        return self.update_service(
            service_id,
            message_limit=message_limit,
            sms_daily_limit=sms_daily_limit,
            restricted=(not live),
            go_live_at=str(datetime.utcnow()) if live else None,
        )

    @cache.delete("live-service-and-organisation-counts")
    @cache.delete("organisations")
    def update_count_as_live(self, service_id, count_as_live):
        return self.update_service(
            service_id,
            count_as_live=count_as_live,
        )

    # This method is not cached because it calls through to one which is
    def update_message_limit(self, service_id, message_limit):
        return self.update_service(
            service_id,
            message_limit=message_limit,
        )

    # This method is not cached because it calls through to one which is
    def update_sms_message_limit(self, service_id, sms_daily_limit):
        return self.update_service(
            service_id,
            sms_daily_limit=sms_daily_limit,
        )

    @cache.delete("service-{service_id}")
    def update_sms_annual_limit(self, service_id, sms_annual_limit):
        return self.update_service(
            service_id,
            sms_annual_limit=sms_annual_limit,
        )

    @cache.delete("service-{service_id}")
    def update_email_annual_limit(self, service_id, email_annual_limit):
        return self.update_service(
            service_id,
            email_annual_limit=email_annual_limit,
        )

    # This method is not cached because it calls through to one which is
    def update_service_with_properties(self, service_id, properties):
        return self.update_service(service_id, **properties)

    @cache.delete("service-{service_id}")
    def archive_service(self, service_id):
        return self.post("/service/{}/archive".format(service_id), data=None)

    @cache.delete("service-{service_id}")
    def suspend_service(self, service_id):
        return self.post("/service/{}/suspend".format(service_id), data=None)

    @cache.delete("service-{service_id}")
    def resume_service(self, service_id):
        return self.post("/service/{}/resume".format(service_id), data=None)

    @cache.delete("service-{service_id}")
    @cache.delete("user-{user_id}")
    def remove_user_from_service(self, service_id, user_id):
        """
        Remove a user from a service
        """
        endpoint = "/service/{service_id}/users/{user_id}".format(service_id=service_id, user_id=user_id)
        data = _attach_current_user({})
        return self.delete(endpoint, data)

    @cache.delete("service-{service_id}-templates")
    def create_service_template(
        self,
        name,
        type_,
        content,
        service_id,
        subject=None,
        process_type="normal",
        parent_folder_id=None,
        template_category_id=None,
        text_direction_rtl=False,
    ):
        """
        Create a service template.
        """
        data = {
            "name": name,
            "template_type": type_,
            "content": content,
            "service": service_id,
            "process_type": process_type,
            "template_category_id": template_category_id,
        }

        # Move this into `data` dictionary above 👆 when FF_RTL removed
        if current_app.config["FF_RTL"]:
            data["text_direction_rtl"] = text_direction_rtl

        if subject:
            data.update({"subject": subject})
        if parent_folder_id:
            data.update({"parent_folder_id": parent_folder_id})
        data = _attach_current_user(data)
        endpoint = "/service/{0}/template".format(service_id)
        return self.post(endpoint, data)

    @cache.delete("service-{service_id}-templates")
    @cache.delete("template-{id_}-version-None")
    @cache.delete("template-{id_}-versions")
    def update_service_template(
        self,
        id_,
        name,
        type_,
        content,
        service_id,
        subject=None,
        process_type=None,
        template_category_id=None,
        text_direction_rtl=False,
    ):
        """
        Update a service template.
        """
        data = {
            "id": id_,
            "name": name,
            "template_type": type_,
            "content": content,
            "service": service_id,
            "template_category_id": template_category_id,
            "process_type": process_type,
            "text_direction_rtl": text_direction_rtl,
        }

        # Move this into `data` dictionary above 👆 when FF_RTL removed
        if current_app.config["FF_RTL"]:
            data["text_direction_rtl"] = text_direction_rtl

        if subject:
            data.update({"subject": subject})

        data = _attach_current_user(data)
        endpoint = "/service/{0}/template/{1}".format(service_id, id_)
        return self.post(endpoint, data)

    @cache.delete("service-{service_id}-templates")
    @cache.delete("template-{id_}-version-None")
    @cache.delete("template-{id_}-versions")
    def redact_service_template(self, service_id, id_):
        return self.post(
            "/service/{}/template/{}".format(service_id, id_),
            _attach_current_user({"redact_personalisation": True}),
        )

    @cache.delete("service-{service_id}-templates")
    @cache.delete("template-{template_id}-version-None")
    @cache.delete("template-{template_id}-versions")
    def update_service_template_sender(self, service_id, template_id, reply_to):
        data = {
            "reply_to": reply_to,
        }
        data = _attach_current_user(data)
        return self.post("/service/{0}/template/{1}".format(service_id, template_id), data)

    @cache.delete("service-{service_id}-templates")
    @cache.delete("template-{template_id}-version-None")
    @cache.delete("template-{template_id}-versions")
    def update_service_template_postage(self, service_id, template_id, postage):
        return self.post(
            "/service/{0}/template/{1}".format(service_id, template_id),
            _attach_current_user({"postage": postage}),
        )

    @cache.set_service_template("template-{template_id}-version-{version}")
    def get_service_template(self, service_id, template_id, version=None):
        """
        Retrieve a service template.
        """
        endpoint = "/service/{service_id}/template/{template_id}".format(service_id=service_id, template_id=template_id)
        if version:
            endpoint = "{base}/version/{version}".format(base=endpoint, version=version)
        return self.get(endpoint)

    @cache.set("template-{template_id}-versions")
    def get_service_template_versions(self, service_id, template_id):
        """
        Retrieve a list of versions for a template
        """
        endpoint = "/service/{service_id}/template/{template_id}/versions".format(service_id=service_id, template_id=template_id)
        return self.get(endpoint)

    @cache.set("service-{service_id}-templates")
    def get_service_templates(self, service_id):
        """
        Retrieve all templates for service.
        """
        endpoint = "/service/{service_id}/template".format(service_id=service_id)
        return self.get(endpoint)

    # This doesn’t need caching because it calls through to a method which is cached
    def count_service_templates(self, service_id, template_type=None):
        return len(
            [
                template
                for template in self.get_service_templates(service_id)["data"]
                if (not template_type or template["template_type"] == template_type)
            ]
        )

    @cache.delete("service-{service_id}-templates")
    @cache.delete("template-{template_id}-version-None")
    @cache.delete("template-{template_id}-versions")
    def delete_service_template(self, service_id, template_id):
        """
        Set a service template's archived flag to True
        """
        endpoint = "/service/{0}/template/{1}".format(service_id, template_id)
        data = {"archived": True}
        data = _attach_current_user(data)
        return self.post(endpoint, data=data)

    def is_service_name_unique(self, service_id, name):
        """
        Check that the service name or email from are unique across all services.
        """
        endpoint = "/service/name/unique"
        params = {"service_id": service_id, "name": name}
        return self.get(url=endpoint, params=params)["result"]

    def is_service_email_from_unique(self, service_id, email_from):
        """
        Check that the service name or email from are unique across all services.
        """
        endpoint = "/service/email-from/unique"
        params = {"service_id": service_id, "email_from": email_from}
        return self.get(url=endpoint, params=params)["result"]

    # Temp access of service history data. Includes service and api key history
    def get_service_history(self, service_id):
        return self.get("/service/{0}/history".format(service_id))

    # TODO: cache this once the backend is updated to exlude data from the current day
    # @flask_cache.memoize(timeout=_seconds_until_midnight())
    def get_monthly_notification_stats(self, service_id: str, financial_year: int):
        """
        Retrieve monthly notification statistics for a specific service and year.

        Args:
            service_id (str): UUID of the service to get statistics for
            financial_year (int): The financial year to fetch statistics for (YYYY format)

        Returns:
            dict: Monthly notification statistics like this:
            {
                'data': {
                    '2024-04': {'sms': {}, 'email': {}, 'letter': {}},
                    '2024-05': {'sms': {}, 'email': {'technical-failure': 1, 'sending': 26}, 'letter': {}},
                    ...
                },
            }
        """
        return self.get(
            url="/service/{}/notifications/monthly?year={}".format(
                service_id,
                financial_year,
            )
        )

    def get_safelist(self, service_id):
        return self.get(url="/service/{}/safelist".format(service_id))

    @cache.delete("service-{service_id}")
    def update_safelist(self, service_id, data):
        return self.put(url="/service/{}/safelist".format(service_id), data=data)

    def get_inbound_sms(self, service_id, user_number=""):
        # POST prevents the user phone number leaking into our logs
        return self.post(
            "/service/{}/inbound-sms".format(
                service_id,
            ),
            data={"phone_number": user_number},
        )

    def get_most_recent_inbound_sms(self, service_id, page=None):
        return self.get(
            "/service/{}/inbound-sms/most-recent".format(
                service_id,
            ),
            params={"page": page},
        )

    def get_inbound_sms_by_id(self, service_id, notification_id):
        return self.get(
            "/service/{}/inbound-sms/{}".format(
                service_id,
                notification_id,
            )
        )

    def get_inbound_sms_summary(self, service_id):
        return self.get("/service/{}/inbound-sms/summary".format(service_id))

    @cache.delete("service-{service_id}")
    def create_service_inbound_api(self, service_id, url, bearer_token, user_id):
        data = {"url": url, "bearer_token": bearer_token, "updated_by_id": user_id}
        return self.post("/service/{}/inbound-api".format(service_id), data)

    @cache.delete("service-{service_id}")
    def update_service_inbound_api(self, service_id, url, bearer_token, user_id, inbound_api_id):
        data = {"url": url, "updated_by_id": user_id}
        if bearer_token:
            data["bearer_token"] = bearer_token
        return self.post("/service/{}/inbound-api/{}".format(service_id, inbound_api_id), data)

    def get_service_inbound_api(self, service_id, inbound_sms_api_id):
        return self.get("/service/{}/inbound-api/{}".format(service_id, inbound_sms_api_id))["data"]

    @cache.delete("service-{service_id}")
    def delete_service_inbound_api(self, service_id, callback_api_id):
        return self.delete("/service/{}/inbound-api/{}".format(service_id, callback_api_id))

    def get_reply_to_email_addresses(self, service_id):
        return self.get("/service/{}/email-reply-to".format(service_id))

    def get_reply_to_email_address(self, service_id, reply_to_email_id):
        return self.get("/service/{}/email-reply-to/{}".format(service_id, reply_to_email_id))

    def verify_reply_to_email_address(self, service_id, email_address):
        return self.post(
            "/service/{}/email-reply-to/verify".format(service_id),
            data={"email": email_address},
        )

    @cache.delete("service-{service_id}")
    def add_reply_to_email_address(self, service_id, email_address, is_default=False):
        return self.post(
            "/service/{}/email-reply-to".format(service_id),
            data={"email_address": email_address, "is_default": is_default},
        )

    @cache.delete("service-{service_id}")
    def update_reply_to_email_address(self, service_id, reply_to_email_id, email_address, is_default=False):
        return self.post(
            "/service/{}/email-reply-to/{}".format(
                service_id,
                reply_to_email_id,
            ),
            data={"email_address": email_address, "is_default": is_default},
        )

    @cache.delete("service-{service_id}")
    def delete_reply_to_email_address(self, service_id, reply_to_email_id):
        return self.post(
            "/service/{}/email-reply-to/{}/archive".format(service_id, reply_to_email_id),
            data=None,
        )

    def get_letter_contacts(self, service_id):
        return self.get("/service/{}/letter-contact".format(service_id))

    def get_letter_contact(self, service_id, letter_contact_id):
        return self.get("/service/{}/letter-contact/{}".format(service_id, letter_contact_id))

    @cache.delete("service-{service_id}")
    def add_letter_contact(self, service_id, contact_block, is_default=False):
        return self.post(
            "/service/{}/letter-contact".format(service_id),
            data={"contact_block": contact_block, "is_default": is_default},
        )

    @cache.delete("service-{service_id}")
    def update_letter_contact(self, service_id, letter_contact_id, contact_block, is_default=False):
        return self.post(
            "/service/{}/letter-contact/{}".format(
                service_id,
                letter_contact_id,
            ),
            data={"contact_block": contact_block, "is_default": is_default},
        )

    @cache.delete("service-{service_id}")
    def delete_letter_contact(self, service_id, letter_contact_id):
        return self.post(
            "/service/{}/letter-contact/{}/archive".format(service_id, letter_contact_id),
            data=None,
        )

    def get_sms_senders(self, service_id):
        return self.get("/service/{}/sms-sender".format(service_id))

    def get_sms_sender(self, service_id, sms_sender_id):
        return self.get("/service/{}/sms-sender/{}".format(service_id, sms_sender_id))

    @cache.delete("service-{service_id}")
    def add_sms_sender(self, service_id, sms_sender, is_default=False, inbound_number_id=None):
        data = {"sms_sender": sms_sender, "is_default": is_default}
        if inbound_number_id:
            data["inbound_number_id"] = inbound_number_id
        return self.post("/service/{}/sms-sender".format(service_id), data=data)

    @cache.delete("service-{service_id}")
    def update_sms_sender(self, service_id, sms_sender_id, sms_sender, is_default=False):
        return self.post(
            "/service/{}/sms-sender/{}".format(service_id, sms_sender_id),
            data={"sms_sender": sms_sender, "is_default": is_default},
        )

    @cache.delete("service-{service_id}")
    def delete_sms_sender(self, service_id, sms_sender_id):
        return self.post(
            "/service/{}/sms-sender/{}/archive".format(service_id, sms_sender_id),
            data=None,
        )

    def get_service_callback_api(self, service_id, callback_api_id):
        return self.get("/service/{}/delivery-receipt-api/{}".format(service_id, callback_api_id))["data"]

    @cache.delete("service-{service_id}")
    def update_service_callback_api(self, service_id, url, bearer_token, user_id, callback_api_id):
        data = {"url": url, "updated_by_id": user_id}
        if bearer_token:
            data["bearer_token"] = bearer_token
        return self.post(
            "/service/{}/delivery-receipt-api/{}".format(service_id, callback_api_id),
            data,
        )

    @cache.delete("service-{service_id}")
    def delete_service_callback_api(self, service_id, callback_api_id):
        return self.delete("/service/{}/delivery-receipt-api/{}".format(service_id, callback_api_id))

    @cache.delete("service-{service_id}")
    def suspend_service_callback_api(self, service_id, updated_by_id, suspend_unsuspend):
        return self.post(
            "/service/{}/delivery-receipt-api/suspend-callback".format(service_id),
            data={"updated_by_id": updated_by_id, "suspend_unsuspend": suspend_unsuspend},
        )

    @cache.delete("service-{service_id}")
    def create_service_callback_api(self, service_id, url, bearer_token, user_id):
        data = {"url": url, "bearer_token": bearer_token, "updated_by_id": user_id}
        return self.post("/service/{}/delivery-receipt-api".format(service_id), data)

    @cache.delete("service-{service_id}-data-retention")
    def create_service_data_retention(self, service_id, notification_type, days_of_retention):
        data = {
            "notification_type": notification_type,
            "days_of_retention": days_of_retention,
        }

        return self.post("/service/{}/data-retention".format(service_id), data)

    @cache.delete("service-{service_id}-data-retention")
    def update_service_data_retention(self, service_id, data_retention_id, days_of_retention):
        data = {"days_of_retention": days_of_retention}
        return self.post("/service/{}/data-retention/{}".format(service_id, data_retention_id), data)

    @cache.set("service-{service_id}-data-retention")
    def get_service_data_retention(self, service_id):
        return self.get("/service/{}/data-retention".format(service_id))

    def has_accepted_tos(self, service_id):
        return redis_client.get(self._tos_key_name(service_id)) is not None

    def accept_tos(self, service_id):
        if not current_app.config["REDIS_ENABLED"]:
            raise NotImplementedError("Cannot accept ToS without using Redis")

        current_app.logger.info(f"Terms of use accepted by user {current_user.id} for service {service_id}")

        redis_client.set(
            self._tos_key_name(service_id),
            datetime.utcnow().isoformat(),
            ex=int(timedelta(days=30).total_seconds()),
        )

    def has_submitted_use_case(self, service_id):
        # todo: switch this function to just be line 621 a month or so after this change goes in
        # return redis_client.get(self._submitted_use_case_key_name(service_id)) is not None

        # Check if there's existing use case data and validate its structure
        use_case_data = self.get_use_case_data(service_id)
        is_submitted = redis_client.get(self._submitted_use_case_key_name(service_id)) is not None
        if is_submitted and self.is_valid_use_case_format(use_case_data):
            return True

        return False

    def is_valid_use_case_format(self, data):
        # Define the required fields or format for valid use case data
        # We need to make sure old submissions are not counted as completed. This is a temporary fix.
        new_fields = ["exact_daily_sms", "exact_daily_email"]

        # Check if data is a string (might be JSON string that needs parsing)
        if isinstance(data, str):
            try:
                data_dict = json.loads(data)
            except json.JSONDecodeError:
                return False
        else:
            data_dict = data

        # Check for the fields at the top level or nested
        has_required_fields = False
        if isinstance(data_dict, dict):
            # Check top level
            has_required_fields = all(field in data_dict for field in new_fields)

            # If not at top level, try to check nested structures
            if not has_required_fields:
                for key, value in data_dict.items():
                    if isinstance(value, dict):
                        if all(field in value for field in new_fields):
                            has_required_fields = True
                            break

        return has_required_fields

    def register_submit_use_case(self, service_id):
        redis_client.set(
            self._submitted_use_case_key_name(service_id),
            datetime.utcnow().isoformat(),
            ex=int(timedelta(days=30).total_seconds()),
        )

    def get_use_case_data(self, service_id):
        result = redis_client.get(self._use_case_data_name(service_id))
        if result is None:
            return result
        return json.loads(result)

    def store_use_case_data(self, service_id, data):
        redis_client.set(
            self._use_case_data_name(service_id),
            json.dumps(data),
            ex=int(timedelta(days=60).total_seconds()),
        )
        redis_client.delete(self._submitted_use_case_key_name(service_id))

    def _submitted_use_case_key_name(self, service_id):
        return f"use-case-submitted-{service_id}"

    def _use_case_data_name(self, service_id):
        return f"use-case-data-{service_id}"

    def _tos_key_name(self, service_id):
        return f"tos-accepted-{service_id}"

    def aggregate_by_type(self, notification_data):
        counts = {"sms": 0, "email": 0, "letter": 0}
        for month_data in notification_data["data"].values():
            for message_type, message_counts in month_data.items():
                if isinstance(message_counts, dict):
                    counts[message_type] += sum(message_counts.values())

        # return the result
        return counts


service_api_client = ServiceAPIClient()
