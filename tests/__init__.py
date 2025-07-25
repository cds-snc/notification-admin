import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import freezegun
import pytest
from flask import session as flask_session
from flask import url_for
from flask.testing import FlaskClient
from flask_login import login_user

from app.models.enum.template_process_types import TemplateProcessTypes
from app.models.service import Service
from app.models.user import User
from app.tou import TERMS_KEY

DEFAULT_TEMPLATE_CATEGORY_LOW = "0dda24c2-982a-4f44-9749-0e38b2607e89"
DEFAULT_TEMPLATE_CATEGORY_MEDIUM = "f75d6706-21b7-437e-b93a-2c0ab771e28e"
DEFAULT_TEMPLATE_CATEGORY_HIGH = "c4f87d7c-a55b-4c0f-91fe-e56c65bb1871"
TESTING_TEMPLATE_CATEGORY = "f3b8a8d1-6e3f-4b93-bb7b-3a8d3f625f17"

# Add itsdangerous to the libraries which freezegun ignores to avoid errors.
# In tests where we freeze time, the code in the test function will get the frozen time but the
# fixtures will be using the current time. This causes itsdangerous to raise an exception - when
# the session is decoded it appears to be created in the future.
freezegun.configure(extend_ignore_list=["itsdangerous"])  # type: ignore


class dotdict(dict):
    """dot.notation access to dictionary attributes"""

    __getattr__ = dict.get
    __setattr__ = dict.__setitem__  # type: ignore
    __delattr__ = dict.__delitem__  # type: ignore


class MockRedis:
    def __init__(self, cache=dict()):
        self.cache = cache

    def get(self, key):
        if key in self.cache:
            return self.cache[key]
        return None

    def set(self, key, value, *args, **kwargs):
        self.cache[key] = value

    def delete(self, key):
        self.cache.pop(key, None)


class TestClient(FlaskClient):
    def login(self, user, mocker=None, service=None, agree_to_terms=True):
        # Skipping authentication here and just log them in
        model_user = User(user)
        with self.session_transaction() as session:
            session["current_session_id"] = model_user.current_session_id
            session["user_id"] = model_user.id

            if agree_to_terms:
                session[TERMS_KEY] = True
        if mocker:
            mocker.patch("app.user_api_client.get_user", return_value=user)
        if mocker and service:
            with self.session_transaction() as session:
                session["service_id"] = service["id"]
            mocker.patch("app.service_api_client.get_service", return_value={"data": service})

        with patch("app.events_api_client.create_event"):
            login_user(model_user)
        with self.session_transaction() as test_session:
            for key, value in flask_session.items():
                test_session[key] = value

    def logout(self, user):
        self.get(url_for("main.sign_out"))


def sample_uuid():
    return "6ce466d0-fd6a-11e5-82f5-e0accb9d11a6"


def generate_uuid():
    return uuid.uuid4()


def created_by_json(id_, name="", email_address=""):
    return {"id": id_, "name": name, "email_address": email_address}


def user_json(
    id_="1234",
    name="Test User",
    email_address="test@canada.ca",
    email_domain=None,
    mobile_number="+16502532222",
    blocked=False,
    password_changed_at=None,
    permissions={
        generate_uuid(): [
            "view_activity",
            "send_texts",
            "send_emails",
            "send_letters",
            "manage_users",
            "manage_templates",
            "manage_settings",
            "manage_api_keys",
        ]
    },
    auth_type="sms_auth",
    failed_login_count=0,
    logged_in_at=None,
    state="active",
    max_failed_login_count=3,
    platform_admin=False,
    current_session_id="1234",
    organisations=[],
    services=None,
):
    return {
        "id": id_,
        "name": name,
        "email_address": email_address,
        "email_domain": email_address.split("@")[-1],
        "mobile_number": mobile_number,
        "password_changed_at": password_changed_at,
        "permissions": permissions,
        "auth_type": auth_type,
        "failed_login_count": failed_login_count,
        "logged_in_at": logged_in_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f"),
        "state": state,
        "max_failed_login_count": max_failed_login_count,
        "platform_admin": platform_admin,
        "current_session_id": current_session_id,
        "organisations": organisations,
        "blocked": blocked,
        "services": list(permissions.keys()) if services is None else services,
    }


def invited_user(
    _id="1234",
    service=None,
    from_user="1234",
    email_address="testinviteduser@canada.ca",
    permissions=None,
    status="pending",
    created_at=datetime.utcnow(),
    auth_type="sms_auth",
    organisation=None,
    blocked=False,
):
    data = {
        "id": _id,
        "from_user": from_user,
        "email_address": email_address,
        "status": status,
        "created_at": created_at,
        "auth_type": auth_type,
    }
    if service:
        data["service"] = service
    if permissions:
        data["permissions"] = permissions
    if organisation:
        data["organisation"] = organisation

    return data


def service_json(
    id_="1234",
    name="Test Service",
    users=None,
    message_limit=1000,
    sms_daily_limit=1000,
    rate_limit=100,
    email_annual_limit=20000000,
    sms_annual_limit=100000,
    active=True,
    restricted=True,
    email_from="test.service",
    reply_to_email_address=None,
    sms_sender="GOVUK",
    research_mode=False,
    email_branding=None,
    default_branding_is_french=False,
    branding="fip_english",
    created_at=None,
    letter_contact_block=None,
    inbound_api=None,
    service_callback_api=None,
    permissions=None,
    organisation_type="central",
    prefix_sms=True,
    contact_link=None,
    organisation_id=None,
    sending_domain=None,
    go_live_user=None,
    organisation_notes="",
    sensitive_service=None,
):
    if users is None:
        users = []
    if permissions is None:
        permissions = ["email", "sms"]
    if inbound_api is None:
        inbound_api = []
    service_dict = {
        "id": id_,
        "name": name,
        "users": users,
        "message_limit": message_limit,
        "sms_daily_limit": sms_daily_limit,
        "rate_limit": rate_limit,
        "email_annual_limit": email_annual_limit,
        "sms_annual_limit": sms_annual_limit,
        "active": active,
        "restricted": restricted,
        "email_from": email_from,
        "reply_to_email_address": reply_to_email_address,
        "sms_sender": sms_sender,
        "research_mode": research_mode,
        "organisation_type": organisation_type,
        "email_branding": email_branding,
        "default_branding_is_french": default_branding_is_french,
        "branding": branding,
        "created_at": created_at or str(datetime.utcnow()),
        "letter_branding": None,
        "letter_contact_block": letter_contact_block,
        "permissions": permissions,
        "inbound_api": inbound_api,
        "service_callback_api": service_callback_api,
        "prefix_sms": prefix_sms,
        "contact_link": None,
        "volume_email": 111111,
        "volume_sms": 222222,
        "volume_letter": 333333,
        "consent_to_research": True,
        "count_as_live": True,
        "organisation": organisation_id,
        "sending_domain": sending_domain,
        "go_live_user": go_live_user,
        "organisation_notes": organisation_notes,
        "sensitive_service": sensitive_service,
    }
    service: Service = dotdict(service_dict)
    return service


def organisation_json(
    id_="1234",
    name=False,
    users=None,
    active=True,
    created_at=None,
    services=None,
    letter_branding_id=None,
    email_branding_id=None,
    domains=None,
    crown=True,
    default_branding_is_french=False,
    agreement_signed=False,
    agreement_signed_version=None,
    agreement_signed_on_behalf_of_name=None,
    agreement_signed_on_behalf_of_email_address=None,
    organisation_type="",
    request_to_go_live_notes=None,
):
    if users is None:
        users = []
    if services is None:
        services = []
    return {
        "id": id_,
        "name": "Test Organisation" if name is False else name,
        "active": active,
        "users": users,
        "created_at": created_at or str(datetime.utcnow()),
        "email_branding_id": email_branding_id,
        "letter_branding_id": letter_branding_id,
        "organisation_type": organisation_type,
        "crown": crown,
        "default_branding_is_french": default_branding_is_french,
        "agreement_signed": agreement_signed,
        "agreement_signed_at": None,
        "agreement_signed_by": None,
        "agreement_signed_version": agreement_signed_version,
        "agreement_signed_on_behalf_of_name": agreement_signed_on_behalf_of_name,
        "agreement_signed_on_behalf_of_email_address": agreement_signed_on_behalf_of_email_address,
        "domains": domains or [],
        "request_to_go_live_notes": request_to_go_live_notes,
        "count_of_live_services": len(services),
    }


def template_category_json(
    id_,
    name_en="name_en",
    name_fr="name_fr",
    description_en="description_en",
    description_fr="description_fr",
    hidden=False,
    sms_process_type="bulk",
    email_process_type="bulk",
):
    template_category = {
        "id": id_,
        "name_en": name_en,
        "name_fr": name_fr,
        "description_en": description_en,
        "description_fr": description_fr,
        "hidden": hidden,
        "sms_process_type": sms_process_type,
        "email_process_type": email_process_type,
    }
    return template_category


def template_json(
    service_id,
    id_,
    name="sample template",
    type_=None,
    content=None,
    subject=None,
    version=1,
    archived=False,
    process_type=TemplateProcessTypes.BULK.value,
    process_type_column=TemplateProcessTypes.BULK.value,
    redact_personalisation=None,
    service_letter_contact=None,
    reply_to=None,
    reply_to_text=None,
    is_precompiled_letter=False,
    postage=None,
    folder=None,
    template_category_id=DEFAULT_TEMPLATE_CATEGORY_LOW,
):
    template = {
        "id": id_,
        "template_category_id": template_category_id,
        "name": name,
        "template_type": type_ or "sms",
        "content": content,
        "service": service_id,
        "version": version,
        "updated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f"),
        "archived": archived,
        "process_type": process_type,
        "process_type_column": process_type_column,
        "service_letter_contact": service_letter_contact,
        "reply_to": reply_to,
        "reply_to_text": reply_to_text,
        "is_precompiled_letter": is_precompiled_letter,
        "folder": folder,
        "postage": postage,
        "template_category": template_category_json(template_category_id, hidden=True, name_en="HIDDEN_CATEGORY"),
    }
    if content is None:
        template["content"] = "template content"
    if subject is None and type_ != "sms":
        template["subject"] = "template subject"
    if subject is not None:
        template["subject"] = subject
    if redact_personalisation is not None:
        template["redact_personalisation"] = redact_personalisation
    return template


def template_version_json(service_id, id_, created_by, version=1, created_at=None, **kwargs):
    template = template_json(service_id, id_, **kwargs)
    template["created_by"] = created_by_json(
        created_by["id"],
        created_by["name"],
        created_by["email_address"],
    )
    if created_at is None:
        created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")
    template["created_at"] = created_at
    template["version"] = version
    return template


def api_key_json(id_, name, expiry_date=None):
    return {"id": id_, "name": name, "expiry_date": expiry_date}


def invite_json(
    id_,
    from_user,
    service_id,
    email_address,
    permissions,
    created_at,
    status,
    auth_type,
    folder_permissions,
):
    return {
        "id": id_,
        "from_user": from_user,
        "service": service_id,
        "email_address": email_address,
        "status": status,
        "permissions": permissions,
        "created_at": created_at,
        "auth_type": auth_type,
        "folder_permissions": folder_permissions,
    }


def org_invite_json(id_, invited_by, org_id, email_address, created_at, status):
    return {
        "id": id_,
        "invited_by": invited_by,
        "organisation": org_id,
        "email_address": email_address,
        "status": status,
        "created_at": created_at,
    }


TEST_USER_EMAIL = "test@user.canada.ca"


def create_test_api_user(state, permissions={}):
    user_data = {
        "id": 1,
        "name": "Test User",
        "password": "somepassword",
        "email_address": TEST_USER_EMAIL,
        "mobile_number": "+441234123412",
        "state": state,
        "permissions": permissions,
        "blocked": False,
    }
    return user_data


def job_json(
    service_id,
    created_by,
    job_id=None,
    template_id=None,
    template_version=1,
    created_at=None,
    bucket_name="",
    original_file_name="thisisatest.csv",
    notification_count=1,
    notifications_sent=1,
    notifications_requested=1,
    job_status="finished",
    scheduled_for="",
    api_key=None,
    archived=False,
):
    if job_id is None:
        job_id = str(generate_uuid())
    if template_id is None:
        template_id = "5d729fbd-239c-44ab-b498-75a985f3198f"
    if created_at is None:
        created_at = str(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f%z"))
    data = {
        "id": job_id,
        "service": service_id,
        "template": template_id,
        "template_version": template_version,
        "original_file_name": original_file_name,
        "created_at": created_at,
        "notification_count": notification_count,
        "notifications_sent": notifications_sent,
        "notifications_requested": notifications_requested,
        "job_status": job_status,
        "statistics": [],
        "created_by": created_by_json(
            created_by["id"],
            created_by["name"],
            created_by["email_address"],
        ),
        "scheduled_for": scheduled_for,
        "api_key": api_key,
        "archived": archived,
    }
    return data


def notification_json(
    service_id,
    job=None,
    template=None,
    to=None,
    status=None,
    provider_response=None,
    feedback_reason=None,
    sent_at=None,
    job_row_number=None,
    created_at=None,
    updated_at=None,
    with_links=False,
    rows=5,
    personalisation=None,
    template_type=None,
    reply_to_text=None,
    client_reference=None,
    created_by_name=None,
    postage=None,
    api_key=None,
):
    if template is None:
        template = template_json(service_id, str(generate_uuid()), type_=template_type)
    if to is None:
        if template_type == "letter":
            to = "1 Example Street"
        elif template_type == "email":
            to = "example@canada.ca"
        else:
            to = "6502532222"
    if sent_at is None:
        sent_at = str(datetime.utcnow().time())
    if created_at is None:
        created_at = datetime.now(timezone.utc).isoformat()
    if updated_at is None:
        updated_at = str((datetime.utcnow() + timedelta(minutes=1)).time())
    if status is None:
        status = "delivered"
    links = {}
    if template_type == "letter":
        postage = postage or "second"

    if with_links:
        links = {
            "prev": "/service/{}/notifications?page=0".format(service_id),
            "next": "/service/{}/notifications?page=1".format(service_id),
            "last": "/service/{}/notifications?page=2".format(service_id),
        }

    job_payload = None
    if job:
        job_payload = {"id": job["id"], "original_file_name": job["original_file_name"]}

    data = {
        "notifications": [
            {
                "id": sample_uuid(),
                "to": to,
                "api_key": api_key,
                "template": template,
                "job": job_payload,
                "sent_at": sent_at,
                "status": status,
                "provider_response": provider_response,
                "feedback_reason": feedback_reason,
                "created_at": created_at,
                "created_by": None,
                "updated_at": updated_at,
                "job_row_number": job_row_number,
                "service": service_id,
                "template_version": template["version"],
                "personalisation": personalisation or {},
                "postage": postage,
                "notification_type": template_type,
                "reply_to_text": reply_to_text,
                "client_reference": client_reference,
                "created_by_name": created_by_name,
            }
            for i in range(rows)
        ],
        "total": rows,
        "page_size": 50,
        "links": links,
    }
    return data


def single_notification_json(
    service_id,
    job=None,
    template=None,
    status=None,
    sent_at=None,
    created_at=None,
    updated_at=None,
    api_key=None,
    notification_type="sms",
):
    if template is None:
        template = template_json(service_id, str(generate_uuid()))
    if sent_at is None:
        sent_at = str(datetime.utcnow())
    if created_at is None:
        created_at = str(datetime.utcnow())
    if updated_at is None:
        updated_at = str(datetime.utcnow() + timedelta(minutes=1))
    if status is None:
        status = "delivered"
    job_payload = None
    if job:
        job_payload = {"id": job["id"], "original_file_name": job["original_file_name"]}

    data = {
        "sent_at": sent_at,
        "to": "6502532222",
        "billable_units": 1,
        "status": status,
        "created_at": created_at,
        "reference": None,
        "updated_at": updated_at,
        "template_version": 5,
        "service": service_id,
        "id": "29441662-17ce-4ffe-9502-fcaed73b2826",
        "template": template,
        "job_row_number": 0,
        "notification_type": notification_type,
        "api_key": api_key,
        "job": job_payload,
        "sent_by": "mmg",
    }
    return data


def validate_route_permission(mocker, app_, method, response_code, route, permissions, usr, service):
    usr["permissions"][str(service["id"])] = permissions
    usr["services"] = [service["id"]]
    mocker.patch("app.user_api_client.check_verify_code", return_value=(True, ""))
    mocker.patch("app.service_api_client.get_services", return_value={"data": []})
    mocker.patch("app.service_api_client.update_service", return_value=service)
    mocker.patch("app.service_api_client.update_service_with_properties", return_value=service)
    mocker.patch("app.user_api_client.get_user", return_value=usr)
    mocker.patch("app.user_api_client.get_user_by_email", return_value=usr)
    mocker.patch("app.service_api_client.get_service", return_value={"data": service})
    mocker.patch("app.models.user.Users.client", return_value=[usr])
    mocker.patch("app.job_api_client.has_jobs", return_value=False)
    with app_.test_request_context():
        with app_.test_client() as client:
            client.login(usr)
            resp = None
            if method == "GET":
                resp = client.get(route)
            elif method == "POST":
                resp = client.post(route)
            else:
                pytest.fail("Invalid method call {}".format(method))
            if resp.status_code != response_code:
                pytest.fail("Invalid permissions set for endpoint {}".format(route))
    return resp


def validate_route_permission_with_client(mocker, client, method, response_code, route, permissions, usr, service):
    usr["permissions"][str(service["id"])] = permissions
    mocker.patch("app.user_api_client.check_verify_code", return_value=(True, ""))
    mocker.patch("app.service_api_client.get_services", return_value={"data": []})
    mocker.patch("app.service_api_client.update_service", return_value=service)
    mocker.patch("app.service_api_client.update_service_with_properties", return_value=service)
    mocker.patch("app.user_api_client.get_user", return_value=usr)
    mocker.patch("app.user_api_client.get_user_by_email", return_value=usr)
    mocker.patch("app.service_api_client.get_service", return_value={"data": service})
    mocker.patch("app.user_api_client.get_users_for_service", return_value=[usr])
    mocker.patch("app.job_api_client.has_jobs", return_value=False)
    client.login(usr)
    resp = None
    if method == "GET":
        resp = client.get(route)
    elif method == "POST":
        resp = client.post(route)
    else:
        pytest.fail("Invalid method call {}".format(method))
    if resp.status_code != response_code:
        pytest.fail("Invalid permissions set for endpoint {}".format(route))
    return resp


def assert_url_expected(actual: str, expected: str):
    actual_parts = urlparse(actual)
    expected_parts = urlparse(expected)
    for attribute in actual_parts._fields:
        if attribute == "query":
            # query string ordering can be non-deterministic
            # so we need to parse it first, which gives us a
            # dictionary of keys and values, not a
            # serialized string
            assert parse_qs(expected_parts.query) == parse_qs(actual_parts.query)
        else:
            assert getattr(actual_parts, attribute) == getattr(expected_parts, attribute), (
                "Expected redirect: {}\n" "Actual redirect: {}"
            ).format(expected, actual)
