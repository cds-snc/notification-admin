import json
import os
import tempfile
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from unittest.mock import Mock
from uuid import UUID, uuid4

import pytest
from bs4 import BeautifulSoup
from flask import Flask, url_for
from notifications_python_client.errors import HTTPError
from notifications_utils.url_safe_token import generate_token

from app import create_app

from . import (
    TestClient,
    api_key_json,
    assert_url_expected,
    generate_uuid,
    invite_json,
    job_json,
    notification_json,
    org_invite_json,
    organisation_json,
    sample_uuid,
    service_json,
    single_notification_json,
    template_json,
    template_version_json,
    user_json,
)


class ElementNotFound(Exception):
    pass


def a11y_test(html):
    chromedriver_path = os.environ.get('CHROMEDRIVER_BIN', 'node_modules/chromedriver/lib/chromedriver/chromedriver')  # noqa: E501

    temp = tempfile.NamedTemporaryFile(mode='w+t', suffix='.html')
    temp.writelines(html)
    temp.seek(0)
    cmd = "node_modules/axe-cli/axe-cli --disable color-contrast --chrome-options='no-sandbox,disable-setuid-sandbox,disable-dev-shm-usage' --chromedriver-path='" + chromedriver_path + "' file://" + temp.name  # noqa: E501
    output = os.popen(cmd).read()
    temp.close()

    if "0 violations found!" in output:
        return True
    else:
        print(output)  # noqa: T001
        return False


@pytest.fixture
def app_(request):
    app = Flask('app')
    create_app(app)

    ctx = app.app_context()
    ctx.push()

    app.test_client_class = TestClient
    yield app

    ctx.pop()


@pytest.fixture(scope='function')
def service_one(api_user_active):
    return service_json(SERVICE_ONE_ID, 'service one', [api_user_active['id']])


@pytest.fixture(scope='function')
def service_two(api_user_active):
    return service_json(SERVICE_TWO_ID, 'service two', [api_user_active['id']])


@pytest.fixture(scope='function')
def multiple_reply_to_email_addresses(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'email_address': 'test@example.com',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }, {
                'id': '5678',
                'service_id': service_id,
                'email_address': 'test2@example.com',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }, {
                'id': '9457',
                'service_id': service_id,
                'email_address': 'test3@example.com',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }
        ]

    return mocker.patch(
        'app.service_api_client.get_reply_to_email_addresses',
        side_effect=_get,
    )


@pytest.fixture(scope='function')
def no_reply_to_email_addresses(mocker):
    def _get(service_id):
        return []

    return mocker.patch('app.service_api_client.get_reply_to_email_addresses', side_effect=_get)


@pytest.fixture(scope='function')
def single_reply_to_email_address(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'email_address': 'test@example.com',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_reply_to_email_addresses', side_effect=_get)


@pytest.fixture(scope='function')
def get_default_reply_to_email_address(mocker):
    def _get(service_id, reply_to_email_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'email_address': 'test@example.com',
            'is_default': True,
            'created_at': datetime.utcnow(),
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_reply_to_email_address', side_effect=_get)


@pytest.fixture(scope='function')
def get_non_default_reply_to_email_address(mocker):
    def _get(service_id, reply_to_email_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'email_address': 'test@example.com',
            'is_default': False,
            'created_at': datetime.utcnow(),
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_reply_to_email_address', side_effect=_get)


@pytest.fixture(scope='function')
def mock_add_reply_to_email_address(mocker):
    def _add_reply_to(service_id, email_address, is_default=False):
        return

    return mocker.patch('app.service_api_client.add_reply_to_email_address', side_effect=_add_reply_to)


@pytest.fixture(scope='function')
def mock_update_reply_to_email_address(mocker):
    def _update_reply_to(service_id, reply_to_email_id, email_address=None, active=None, is_default=False):
        return

    return mocker.patch('app.service_api_client.update_reply_to_email_address', side_effect=_update_reply_to)


@pytest.fixture(scope='function')
def multiple_letter_contact_blocks(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'contact_block': '1 Example Street',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }, {
                'id': '5678',
                'service_id': service_id,
                'contact_block': '2 Example Street',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }, {
                'id': '9457',
                'service_id': service_id,
                'contact_block': '3 Example Street',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_letter_contacts', side_effect=_get)


@pytest.fixture(scope='function')
def no_letter_contact_blocks(mocker):
    def _get(service_id):
        return []

    return mocker.patch('app.service_api_client.get_letter_contacts', side_effect=_get)


@pytest.fixture(scope='function')
def single_letter_contact_block(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'contact_block': '1 Example Street',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_letter_contacts', side_effect=_get)


@pytest.fixture(scope='function')
def injected_letter_contact_block(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'contact_block': 'foo\nbar<script>alert(1);</script>',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_letter_contacts', side_effect=_get)


@pytest.fixture(scope='function')
def get_default_letter_contact_block(mocker):
    def _get(service_id, letter_contact_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'contact_block': '1 Example Street',
            'is_default': True,
            'created_at': datetime.utcnow(),
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_letter_contact', side_effect=_get)


@pytest.fixture(scope='function')
def get_non_default_letter_contact_block(mocker):
    def _get(service_id, letter_contact_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'contact_block': '1 Example Street',
            'is_default': False,
            'created_at': datetime.utcnow(),
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_letter_contact', side_effect=_get)


@pytest.fixture(scope='function')
def mock_add_letter_contact(mocker):
    def _add_letter_contact(service_id, contact_block, is_default=False):
        return {'data': {
            'id': '1234',
            'service_id': service_id,
            'contact_block': '1 Example Street',
            'is_default': True,
            'created_at': str(datetime.utcnow()),
            'updated_at': None
        }}

    return mocker.patch('app.service_api_client.add_letter_contact', side_effect=_add_letter_contact)


@pytest.fixture(scope='function')
def mock_update_letter_contact(mocker):
    def _update_letter_contact(service_id, letter_contact_id, contact_block, is_default=False):
        return

    return mocker.patch('app.service_api_client.update_letter_contact', side_effect=_update_letter_contact)


@pytest.fixture(scope='function')
def multiple_sms_senders(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'sms_sender': 'Example',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'inbound_number_id': '1234',
                'updated_at': None
            }, {
                'id': '5678',
                'service_id': service_id,
                'sms_sender': 'Example 2',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }, {
                'id': '9457',
                'service_id': service_id,
                'sms_sender': 'Example 3',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_sms_senders', side_effect=_get)


@pytest.fixture(scope='function')
def multiple_sms_senders_with_diff_default(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'sms_sender': 'Example',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }, {
                'id': '5678',
                'service_id': service_id,
                'sms_sender': 'Example 2',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }, {
                'id': '9457',
                'service_id': service_id,
                'sms_sender': 'Example 3',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'inbound_number_id': '12354',
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_sms_senders', side_effect=_get)


@pytest.fixture(scope='function')
def multiple_sms_senders_no_inbound(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'sms_sender': 'Example',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }, {
                'id': '5678',
                'service_id': service_id,
                'sms_sender': 'Example 2',
                'is_default': False,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_sms_senders', side_effect=_get)


@pytest.fixture(scope='function')
def no_sms_senders(mocker):
    def _get(service_id):
        return []

    return mocker.patch('app.service_api_client.get_sms_senders', side_effect=_get)


@pytest.fixture(scope='function')
def single_sms_sender(mocker):
    def _get(service_id):
        return [
            {
                'id': '1234',
                'service_id': service_id,
                'sms_sender': 'GOVUK',
                'is_default': True,
                'created_at': datetime.utcnow(),
                'inbound_number_id': None,
                'updated_at': None
            }
        ]

    return mocker.patch('app.service_api_client.get_sms_senders', side_effect=_get)


@pytest.fixture(scope='function')
def get_default_sms_sender(mocker):
    def _get(service_id, sms_sender_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'sms_sender': 'GOVUK',
            'is_default': True,
            'created_at': datetime.utcnow(),
            'inbound_number_id': None,
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_sms_sender', side_effect=_get)


@pytest.fixture(scope='function')
def get_non_default_sms_sender(mocker):
    def _get(service_id, sms_sender_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'sms_sender': 'GOVUK',
            'is_default': False,
            'created_at': datetime.utcnow(),
            'inbound_number_id': None,
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_sms_sender', side_effect=_get)


@pytest.fixture(scope='function')
def get_inbound_number_sms_sender(mocker):
    def _get(service_id, sms_sender_id):
        return {
            'id': '1234',
            'service_id': service_id,
            'sms_sender': 'GOVUK',
            'is_default': False,
            'created_at': datetime.utcnow(),
            'inbound_number_id': '1234',
            'updated_at': None
        }

    return mocker.patch('app.service_api_client.get_sms_sender', side_effect=_get)


@pytest.fixture(scope='function')
def mock_add_sms_sender(mocker):
    def _add_sms_sender(service_id, sms_sender, is_default=False, inbound_number_id=None):
        return

    return mocker.patch('app.service_api_client.add_sms_sender', side_effect=_add_sms_sender)


@pytest.fixture(scope='function')
def mock_update_sms_sender(mocker):
    def _update_sms_sender(service_id, sms_sender_id, sms_sender=None, active=None, is_default=False):
        return

    return mocker.patch('app.service_api_client.update_sms_sender', side_effect=_update_sms_sender)


@pytest.fixture(scope='function')
def multiple_available_inbound_numbers(mocker):
    def _get():
        return {'data': [
            {
                'active': True,
                'created_at': '2017-10-18T16:57:14.154185Z',
                'id': '781d9c60-7a7e-46b7-9896-7b045b992fa7',
                'number': '0712121214',
                'provider': 'mmg',
                'service': None,
                'updated_at': None
            }, {
                'active': True,
                'created_at': '2017-10-18T16:57:22.585806Z',
                'id': '781d9c60-7a7e-46b7-9896-7b045b992fa5',
                'number': '0712121215',
                'provider': 'mmg',
                'service': None,
                'updated_at': None
            }, {
                'active': True,
                'created_at': '2017-10-18T16:57:38.585806Z',
                'id': '781d9c61-7a7e-46b7-9896-7b045b992fa5',
                'number': '0712121216',
                'provider': 'mmg',
                'service': None,
                'updated_at': None
            }
        ]}

    return mocker.patch('app.inbound_number_client.get_available_inbound_sms_numbers', side_effect=_get)


@pytest.fixture(scope='function')
def no_available_inbound_numbers(mocker):
    def _get():
        return {'data': []}

    return mocker.patch('app.inbound_number_client.get_available_inbound_sms_numbers', side_effect=_get)


@pytest.fixture(scope='function')
def fake_uuid():
    return sample_uuid()


@pytest.fixture(scope='function')
def mock_get_service(mocker, api_user_active):
    def _get(service_id):
        service = service_json(service_id, users=[api_user_active['id']], message_limit=50)
        return {'data': service}

    return mocker.patch('app.service_api_client.get_service', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_international_service(mocker, api_user_active):
    def _get(service_id):
        service = service_json(service_id, users=[api_user_active['id']], permissions=['sms', 'international_sms'])
        return {'data': service}

    return mocker.patch('app.service_api_client.get_service', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_service_statistics(mocker, api_user_active):
    def _get(service_id, today_only, limit_days=None):
        return {
            'email': {'requested': 0, 'delivered': 0, 'failed': 0},
            'sms': {'requested': 0, 'delivered': 0, 'failed': 0},
            'letter': {'requested': 0, 'delivered': 0, 'failed': 0}
        }

    return mocker.patch('app.service_api_client.get_service_statistics', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_detailed_services(mocker, fake_uuid):
    service_one = service_json(
        id_=SERVICE_ONE_ID,
        name="service_one",
        users=[fake_uuid],
        message_limit=1000,
        active=True,
        restricted=False,
    )
    service_two = service_json(
        id_=fake_uuid,
        name="service_two",
        users=[fake_uuid],
        message_limit=1000,
        active=True,
        restricted=True,
    )
    service_one['statistics'] = {
        'email': {'requested': 0, 'delivered': 0, 'failed': 0},
        'sms': {'requested': 0, 'delivered': 0, 'failed': 0},
        'letter': {'requested': 0, 'delivered': 0, 'failed': 0}

    }
    service_two['statistics'] = {
        'email': {'requested': 0, 'delivered': 0, 'failed': 0},
        'sms': {'requested': 0, 'delivered': 0, 'failed': 0},
        'letter': {'requested': 0, 'delivered': 0, 'failed': 0}

    }
    services = {'data': [service_one, service_two]}

    return mocker.patch('app.service_api_client.get_services', return_value=services)


@pytest.fixture(scope='function')
def mock_service_name_is_not_unique(mocker):
    return mocker.patch('app.service_api_client.is_service_name_unique', return_value=False)


@pytest.fixture(scope='function')
def mock_service_name_is_unique(mocker):
    return mocker.patch('app.service_api_client.is_service_name_unique', return_value=True)


@pytest.fixture(scope='function')
def mock_get_live_service(mocker, api_user_active):
    def _get(service_id):
        service = service_json(
            service_id,
            users=[api_user_active['id']],
            restricted=False)
        return {'data': service}

    return mocker.patch('app.service_api_client.get_service', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_service_with_letters(mocker, api_user_active):
    def _get(service_id):
        return {'data': service_json(
            service_id,
            users=[api_user_active['id']],
            restricted=False,
            permissions=['email', 'sms', 'letter']
        )}

    return mocker.patch('app.service_api_client.get_service', side_effect=_get)


@pytest.fixture(scope='function')
def mock_create_service(mocker):
    def _create(
        service_name,
        organisation_type,
        message_limit,
        restricted,
        user_id,
        email_from,
    ):
        service = service_json(
            101, service_name, [user_id], message_limit=message_limit, restricted=restricted, email_from=email_from)
        return service['id']

    return mocker.patch(
        'app.service_api_client.create_service', side_effect=_create)


@pytest.fixture(scope='function')
def mock_create_duplicate_service(mocker):
    def _create(
        service_name,
        organisation_type,
        message_limit,
        restricted,
        user_id,
        email_from,
    ):
        json_mock = Mock(return_value={'message': {'name': ["Duplicate service name '{}'".format(service_name)]}})
        resp_mock = Mock(status_code=400, json=json_mock)
        http_error = HTTPError(response=resp_mock, message="Default message")
        raise http_error

    return mocker.patch(
        'app.service_api_client.create_service', side_effect=_create)


@pytest.fixture(scope='function')
def mock_update_service(mocker):
    def _update(service_id, **kwargs):
        service = service_json(
            service_id,
            **{key: kwargs[key] for key in kwargs if key in [
                'name',
                'users',
                'message_limit',
                'active',
                'restricted',
                'email_from',
                'sms_sender',
                'permissions'
            ]}
        )
        return {'data': service}

    return mocker.patch(
        'app.service_api_client.update_service', side_effect=_update, autospec=True)


@pytest.fixture(scope='function')
def mock_update_service_raise_httperror_duplicate_name(mocker):
    def _update(
        service_id,
        **kwargs
    ):
        json_mock = Mock(return_value={'message': {'name': ["Duplicate service name '{}'".format(kwargs.get('name'))]}})
        resp_mock = Mock(status_code=400, json=json_mock)
        http_error = HTTPError(response=resp_mock, message="Default message")
        raise http_error

    return mocker.patch(
        'app.service_api_client.update_service', side_effect=_update)


SERVICE_ONE_ID = "596364a0-858e-42c8-9062-a8fe822260eb"
SERVICE_TWO_ID = "147ad62a-2951-4fa1-9ca0-093cd1a52c52"
ORGANISATION_ID = "c011fa40-4cbe-4524-b415-dde2f421bd9c"
ORGANISATION_TWO_ID = "d9b5be73-0b36-4210-9d89-8f1a5c2fef26"
TEMPLATE_ONE_ID = "b22d7d94-2197-4a7d-a8e7-fd5f9770bf48"
USER_ONE_ID = "7b395b52-c6c1-469c-9d61-54166461c1ab"


@pytest.fixture(scope='function')
def mock_get_services(mocker, fake_uuid, user=None):
    if user is None:
        user = active_user_with_permissions(fake_uuid)

    def _get_services(params_dict=None):
        service_one = service_json(
            SERVICE_ONE_ID, "service_one", [user['id']], 1000, True, False)
        service_two = service_json(
            SERVICE_TWO_ID, "service_two", [user['id']], 1000, True, False)
        return {'data': [service_one, service_two]}

    return mocker.patch(
        'app.service_api_client.get_services', side_effect=_get_services)


@pytest.fixture(scope='function')
def mock_get_services_with_no_services(mocker, fake_uuid, user=None):
    if user is None:
        user = active_user_with_permissions(fake_uuid)

    def _get_services(params_dict=None):
        return {'data': []}

    return mocker.patch(
        'app.service_api_client.get_services', side_effect=_get_services)


@pytest.fixture(scope='function')
def mock_get_services_with_one_service(mocker, fake_uuid, user=None):
    if user is None:
        user = api_user_active(fake_uuid)

    def _get_services(params_dict=None):
        return {'data': [service_json(
            SERVICE_ONE_ID, "service_one", [user['id']], 1000, True, True
        )]}

    return mocker.patch(
        'app.service_api_client.get_services', side_effect=_get_services)


@pytest.fixture(scope='function')
def mock_get_service_template(mocker):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id, template_id, "Two week reminder", "sms", "Template <em>content</em> with & entity")
        if version:
            template.update({'version': version})
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_service_template_with_priority(mocker):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id, template_id, "Two week reminder", "sms", "Template <em>content</em> with & entity",
            process_type='priority')
        if version:
            template.update({'version': version})
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_deleted_template(mocker):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id,
            template_id,
            "Two week reminder",
            "sms",
            "Template <em>content</em> with & entity",
            archived=True
        )
        if version:
            template.update({'version': version})
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_template_version(mocker, fake_uuid, user=None):
    if user is None:
        user = api_user_active(fake_uuid)

    def _get(service_id, template_id, version):
        template_version = template_version_json(
            service_id,
            template_id,
            user,
            version=version
        )
        return {'data': template_version}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_template_versions(mocker, fake_uuid, user=None):
    if user is None:
        user = api_user_active(fake_uuid)

    def _get(service_id, template_id):
        template_version = template_version_json(
            service_id,
            template_id,
            user,
            version=1
        )
        return {'data': [template_version]}

    return mocker.patch(
        'app.service_api_client.get_service_template_versions',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_service_template_with_placeholders(mocker):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id, template_id, "Two week reminder", "sms", "((name)), Template <em>content</em> with & entity"
        )
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_service_template_with_multiple_placeholders(mocker):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id, template_id, "Two week reminder", "sms", "((one)) ((two)) ((three))"
        )
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_service_template_with_placeholders_same_as_recipient(mocker):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id, template_id, "Two week reminder", "sms", "((name)) ((date)) ((PHONENUMBER))"
        )
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template',
        side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_get_service_email_template(mocker, content=None, subject=None, redact_personalisation=False):
    def _get(service_id, template_id, version=None):
        template = template_json(
            service_id,
            template_id,
            "Two week reminder",
            "email",
            content or "Your vehicle tax expires on ((date))",
            subject or "Your ((thing)) is due soon",
            redact_personalisation=redact_personalisation,
        )
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_service_email_template_without_placeholders(mocker):
    return mock_get_service_email_template(
        mocker,
        content="Your vehicle tax expires soon",
        subject="Your thing is due soon",
    )


@pytest.fixture(scope='function')
def mock_get_service_letter_template(mocker, content=None, subject=None, postage='second'):
    def _get(service_id, template_id, version=None, postage=postage):
        template = template_json(
            service_id,
            template_id,
            "Two week reminder",
            "letter",
            content or "Template <em>content</em> with & entity",
            subject or "Subject",
            postage=postage,
        )
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.get_service_template', side_effect=_get
    )


@pytest.fixture(scope='function')
def mock_create_service_template(mocker, fake_uuid):
    def _create(name, type_, content, service, subject=None, process_type=None, parent_folder_id=None):
        template = template_json(fake_uuid, name, type_, content, service, process_type, parent_folder_id)
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.create_service_template',
        side_effect=_create)


@pytest.fixture(scope='function')
def mock_update_service_template(mocker):
    def _update(id_, name, type_, content, service, subject=None, process_type=None, postage=None):
        template = template_json(service, id_, name, type_, content, subject, process_type, postage)
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.update_service_template',
        side_effect=_update)


@pytest.fixture(scope='function')
def mock_create_service_template_content_too_big(mocker):
    def _create(name, type_, content, service, subject=None, process_type=None, parent_folder_id=None):
        json_mock = Mock(return_value={
            'message': {'content': ["Content has a character count greater than the limit of 459"]},
            'result': 'error'
        })
        resp_mock = Mock(status_code=400, json=json_mock)
        http_error = HTTPError(
            response=resp_mock,
            message={'content': ["Content has a character count greater than the limit of 459"]})
        raise http_error

    return mocker.patch(
        'app.service_api_client.create_service_template',
        side_effect=_create)


@pytest.fixture(scope='function')
def mock_update_service_template_400_content_too_big(mocker):
    def _update(id_, name, type_, content, service, subject=None, process_type=None, postage=None):
        json_mock = Mock(return_value={
            'message': {'content': ["Content has a character count greater than the limit of 459"]},
            'result': 'error'
        })
        resp_mock = Mock(status_code=400, json=json_mock)
        http_error = HTTPError(
            response=resp_mock,
            message={'content': ["Content has a character count greater than the limit of 459"]})
        raise http_error

    return mocker.patch(
        'app.service_api_client.update_service_template',
        side_effect=_update)


def create_service_templates(service_id, number_of_templates=6):
    template_types = ["sms", "sms", "email", "email", "letter", "letter"]
    service_templates = []

    for _ in range(1, number_of_templates + 1):
        template_number = "two" if _ % 2 == 0 else "one"
        template_type = template_types[(_ % 6) - 1]

        service_templates.append(template_json(
            service_id,
            TEMPLATE_ONE_ID if _ == 1 else str(generate_uuid()),
            "{}_template_{}".format(template_type, template_number),
            template_type,
            "{} template {} content".format(template_type, template_number),
            subject="{} template {} subject".format(template_type, template_number)
                    if template_type in ["email", "letter"] else None
        ))

    return {'data': service_templates}


def _template(template_type, name, parent=None, template_id=None):
    return {
        'id': template_id or str(uuid4()),
        'name': name,
        'template_type': template_type,
        'folder': parent,
    }


@pytest.fixture(scope='function')
def mock_get_service_templates(mocker):
    def _create(service_id):
        return create_service_templates(service_id)

    return mocker.patch(
        'app.service_api_client.get_service_templates',
        side_effect=_create)


@pytest.fixture(scope='function')
def mock_get_more_service_templates_than_can_fit_onscreen(mocker):
    def _create(service_id):
        return create_service_templates(service_id, number_of_templates=20)

    return mocker.patch(
        'app.service_api_client.get_service_templates',
        side_effect=_create)


@pytest.fixture(scope='function')
def mock_get_service_templates_when_no_templates_exist(mocker):

    def _create(service_id):
        return {'data': []}

    return mocker.patch(
        'app.service_api_client.get_service_templates',
        side_effect=_create)


@pytest.fixture(scope='function')
def mock_get_service_templates_with_only_one_template(mocker):

    def _get(service_id):
        return {'data': [
            template_json(
                service_id, generate_uuid(), "sms_template_one", "sms", "sms template one content"
            )
        ]}

    return mocker.patch(
        'app.service_api_client.get_service_templates',
        side_effect=_get)


@pytest.fixture(scope='function')
def mock_delete_service_template(mocker):
    def _delete(service_id, template_id):
        template = template_json(
            service_id, template_id, "Template to delete", "sms", "content to be deleted")
        return {'data': template}

    return mocker.patch(
        'app.service_api_client.delete_service_template', side_effect=_delete)


@pytest.fixture(scope='function')
def mock_redact_template(mocker):
    return mocker.patch('app.service_api_client.redact_service_template')


@pytest.fixture(scope='function')
def mock_update_service_template_sender(mocker):
    def _update(service_id, template_id, reply_to):
        return

    return mocker.patch(
        'app.service_api_client.update_service_template_sender',
        side_effect=_update
    )


@pytest.fixture(scope='function')
def api_user_pending(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'pending',
                 'failed_login_count': 0,
                 'platform_admin': False,
                 'permissions': {},
                 'organisations': [],
                 'current_session_id': None,
                 'password_changed_at': str(datetime.utcnow()),
                 }
    return user_data


@pytest.fixture(scope='function')
def platform_admin_user(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Platform admin user',
                 'password': 'somepassword',
                 'email_address': 'platform@admin.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {SERVICE_ONE_ID: ['send_texts',
                                                  'send_emails',
                                                  'send_letters',
                                                  'manage_users',
                                                  'manage_templates',
                                                  'manage_settings',
                                                  'manage_api_keys',
                                                  'view_activity']},
                 'platform_admin': True,
                 'auth_type': 'sms_auth',
                 'password_changed_at': str(datetime.utcnow()),
                 'services': [],
                 'organisations': [],
                 'current_session_id': None,
                 'logged_in_at': None,
                 }
    return user_data


@pytest.fixture(scope='function')
def api_user_active(fake_uuid, email_address='test@user.canada.ca'):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'email_address': email_address,
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {},
                 'platform_admin': False,
                 'auth_type': 'sms_auth',
                 'password_changed_at': str(datetime.utcnow()),
                 'services': [],
                 'organisations': [],
                 'current_session_id': None,
                 'logged_in_at': None,
                 'security_keys': []
                 }
    return user_data


@pytest.fixture(scope='function')
def api_user_active_email_auth(fake_uuid, email_address='test@user.canada.ca'):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'email_address': email_address,
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {},
                 'platform_admin': False,
                 'auth_type': 'email_auth',
                 'password_changed_at': str(datetime.utcnow()),
                 'services': [],
                 'organisations': [],
                 'current_session_id': None,
                 'security_keys': []
                 }
    return user_data


@pytest.fixture(scope='function')
def api_nongov_user_active(fake_uuid):
    user_data = {
        'id': fake_uuid,
        'name': 'Test User',
        'password': 'somepassword',
        'email_address': 'someuser@notonwhitelist.com',
        'mobile_number': '6502532222',
        'blocked': False,
        'state': 'active',
        'failed_login_count': 0,
        'permissions': {SERVICE_ONE_ID: [
            'send_texts',
            'send_emails',
            'send_letters',
            'manage_users',
            'manage_templates',
            'manage_settings',
            'manage_api_keys',
            'view_activity',
        ]},
        'platform_admin': False,
        'auth_type': 'sms_auth',
        'password_changed_at': str(datetime.utcnow()),
        'services': [],
        'organisations': [],
        'current_session_id': None,
    }
    return user_data


@pytest.fixture(scope='function')
def active_user_with_permissions(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'password_changed_at': str(datetime.utcnow()),
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {SERVICE_ONE_ID: ['send_texts',
                                                  'send_emails',
                                                  'send_letters',
                                                  'manage_users',
                                                  'manage_templates',
                                                  'manage_settings',
                                                  'manage_api_keys',
                                                  'view_activity']},
                 'platform_admin': False,
                 'auth_type': 'sms_auth',
                 'organisations': [ORGANISATION_ID],
                 'services': [SERVICE_ONE_ID],
                 'current_session_id': None,
                 }
    return user_data


@pytest.fixture(scope='function')
def active_user_with_permission_to_two_services(fake_uuid):

    permissions = [
        'send_texts',
        'send_emails',
        'send_letters',
        'manage_users',
        'manage_templates',
        'manage_settings',
        'manage_api_keys',
        'view_activity',
    ]

    return {
        'id': fake_uuid,
        'name': 'Test User',
        'password': 'somepassword',
        'password_changed_at': str(datetime.utcnow()),
        'email_address': 'test@user.canada.ca',
        'mobile_number': '6502532222',
        'blocked': False,
        'state': 'active',
        'failed_login_count': 0,
        'permissions': {
            SERVICE_ONE_ID: permissions,
            SERVICE_TWO_ID: permissions,
        },
        'platform_admin': False,
        'auth_type': 'sms_auth',
        'organisations': [ORGANISATION_ID],
        'services': [SERVICE_ONE_ID, SERVICE_TWO_ID],
        'current_session_id': None,
    }


@pytest.fixture(scope='function')
def active_caseworking_user(fake_uuid):

    user_data = {
        'id': fake_uuid,
        'name': 'Test User',
        'password': 'somepassword',
        'password_changed_at': str(datetime.utcnow()),
        'email_address': 'caseworker@example.canada.ca',
        'mobile_number': '6502532222',
        'blocked': False,
        'state': 'active',
        'failed_login_count': 0,
        'permissions': {SERVICE_ONE_ID: [
            'send_texts',
            'send_emails',
            'send_letters',
        ]},
        'platform_admin': False,
        'auth_type': 'sms_auth',
        'organisations': [],
        'services': [SERVICE_ONE_ID],
        'current_session_id': None,
    }
    return user_data


@pytest.fixture(scope='function')
def active_user_no_mobile(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'password_changed_at': str(datetime.utcnow()),
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': None,
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {SERVICE_ONE_ID: ['send_texts',
                                                  'send_emails',
                                                  'send_letters',
                                                  'manage_users',
                                                  'manage_templates',
                                                  'manage_settings',
                                                  'manage_api_keys',
                                                  'view_activity']},
                 'platform_admin': False,
                 'auth_type': 'email_auth',
                 'organisations': [],
                 'services': [SERVICE_ONE_ID],
                 'current_session_id': None,
                 }
    return user_data


@pytest.fixture
def active_user_view_permissions(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User With Permissions',
                 'password': 'somepassword',
                 'password_changed_at': str(datetime.utcnow()),
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {SERVICE_ONE_ID: ['view_activity']},
                 'platform_admin': False,
                 'auth_type': 'sms_auth',
                 'organisations': [],
                 'services': [SERVICE_ONE_ID],
                 'current_session_id': None,
                 }
    return user_data


@pytest.fixture
def active_user_empty_permissions(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User With Empty Permissions',
                 'password': 'somepassword',
                 'password_changed_at': str(datetime.utcnow()),
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '07700 900763',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 0,
                 'permissions': {},
                 'platform_admin': False,
                 'auth_type': 'sms_auth',
                 'organisations': [],
                 'services': [SERVICE_ONE_ID],
                 'current_session_id': None,
                 }
    return user_data


@pytest.fixture
def active_user_manage_template_permission(fake_uuid):
    return {
        'id': fake_uuid,
        'name': 'Test User With Permissions',
        'password': 'somepassword',
        'password_changed_at': str(datetime.utcnow()),
        'email_address': 'test@user.canada.ca',
        'mobile_number': '6502532222',
        'blocked': False,
        'state': 'active',
        'failed_login_count': 0,
        'permissions': {SERVICE_ONE_ID: [
            'manage_templates',
            'view_activity',
        ]},
        'platform_admin': False,
        'auth_type': 'sms_auth',
        'organisations': [],
        'services': [SERVICE_ONE_ID],
        'current_session_id': None,
    }


@pytest.fixture
def active_user_no_api_key_permission(fake_uuid):
    return {
        'id': fake_uuid,
        'name': 'Test User With Permissions',
        'password': 'somepassword',
        'password_changed_at': str(datetime.utcnow()),
        'email_address': 'test@user.canada.ca',
        'mobile_number': '6502532222',
        'blocked': False,
        'state': 'active',
        'failed_login_count': 0,
        'permissions': {SERVICE_ONE_ID: [
            'manage_templates',
            'manage_settings',
            'view_activity',
        ]},
        'platform_admin': False,
        'auth_type': 'sms_auth',
        'organisations': [],
        'current_session_id': None,
        'services': [SERVICE_ONE_ID],
    }


@pytest.fixture
def active_user_no_settings_permission(fake_uuid):
    return {
        'id': fake_uuid,
        'name': 'Test User With Permissions',
        'password': 'somepassword',
        'password_changed_at': str(datetime.utcnow()),
        'email_address': 'test@user.canada.ca',
        'mobile_number': '6502532222',
        'blocked': False,
        'state': 'active',
        'failed_login_count': 0,
        'permissions': {SERVICE_ONE_ID: [
            'manage_templates',
            'manage_api_keys',
            'view_activity',
        ]},
        'platform_admin': False,
        'auth_type': 'sms_auth',
        'current_session_id': None,
        'services': [SERVICE_ONE_ID],
        'organisations': [],
    }


@pytest.fixture(scope='function')
def api_user_locked(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 5,
                 'permissions': {},
                 'auth_type': 'sms_auth',
                 'organisations': [],
                 'current_session_id': None,
                 'platform_admin': False,
                 'services': [],
                 }
    return user_data


@pytest.fixture(scope='function')
def api_user_request_password_reset(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 5,
                 'permissions': {},
                 'password_changed_at': str(datetime.utcnow()),
                 'auth_type': 'sms_auth',
                 'organisations': [],
                 'current_session_id': None,
                 'platform_admin': False,
                 'services': [],
                 }
    return user_data


@pytest.fixture(scope='function')
def api_user_changed_password(fake_uuid):
    user_data = {'id': fake_uuid,
                 'name': 'Test User',
                 'password': 'somepassword',
                 'email_address': 'test@user.canada.ca',
                 'mobile_number': '6502532222',
                 'blocked': False,
                 'state': 'active',
                 'failed_login_count': 5,
                 'permissions': {},
                 'auth_type': 'sms_auth',
                 'password_changed_at': str(datetime.utcnow() + timedelta(minutes=1)),
                 'organisations': [],
                 'current_session_id': None,
                 'platform_admin': False,
                 'services': [],
                 }
    return user_data


@pytest.fixture(scope='function')
def mock_send_change_email_verification(mocker):
    return mocker.patch('app.user_api_client.send_change_email_verification')


@pytest.fixture(scope='function')
def mock_register_user(mocker, api_user_pending):
    def _register(name, email_address, mobile_number, password, auth_type):
        api_user_pending['name'] = name
        api_user_pending['email_address'] = email_address
        api_user_pending['mobile_number'] = mobile_number
        api_user_pending['password'] = password
        api_user_pending['auth_type'] = auth_type
        api_user_pending['blocked'] = False
        return api_user_pending

    return mocker.patch('app.user_api_client.register_user', side_effect=_register)


@pytest.fixture(scope='function')
def mock_get_non_govuser(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid(), email_address='someuser@notonwhitelist.com')

    def _get_user(id_):
        user['id'] = id_
        return user

    return mocker.patch(
        'app.user_api_client.get_user', side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_get_user(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid())

    def _get_user(id_):
        user['id'] = id_
        return user

    return mocker.patch(
        'app.user_api_client.get_user', side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_get_login_events(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid())

    return mocker.patch(
        'app.user_api_client.get_login_events_for_user', return_value=[])


@pytest.fixture(scope='function')
def mock_get_login_events_with_data(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid())

    data = [
        {
            "data": {"user-agent": "foo", "location": "bar"}
        },
        {
            "data": {"user-agent": "eggs", "location": "ham"}
        }
    ]
    return mocker.patch(
        'app.user_api_client.get_login_events_for_user', return_value=data)


@pytest.fixture(scope='function')
def mock_get_security_keys(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid())

    return mocker.patch(
        'app.user_api_client.get_security_keys_for_user', return_value=[])


@pytest.fixture(scope='function')
def mock_get_organisation_user(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid())

    def _get_user(id_):
        user['id'] = id_
        return user

    return mocker.patch(
        'app.user_api_client.get_user', side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_get_locked_user(mocker, api_user_locked):
    return mock_get_user(mocker, user=api_user_locked)


@pytest.fixture(scope='function')
def mock_get_user_locked(mocker, api_user_locked):
    return mocker.patch(
        'app.user_api_client.get_user', return_value=api_user_locked)


@pytest.fixture(scope='function')
def mock_get_user_pending(mocker, api_user_pending):
    return mocker.patch(
        'app.user_api_client.get_user', return_value=api_user_pending)


@pytest.fixture(scope='function')
def mock_get_user_by_email(mocker, user=None):
    if user is None:
        user = api_user_active(sample_uuid())

    def _get_user(email_address):
        user['email_address'] = email_address
        return user

    return mocker.patch('app.user_api_client.get_user_by_email', side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_get_unknown_user_by_email(mocker, user=None):
    if user is None:
        user = api_user_active(USER_ONE_ID)

    def _get_user(email_address):
        user['email_address'] = email_address
        return user

    return mocker.patch('app.user_api_client.get_user_by_email', side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_get_locked_user_by_email(mocker, api_user_locked):
    return mock_get_user_by_email(mocker, user=api_user_locked)


@pytest.fixture(scope='function')
def mock_get_user_with_permissions(mocker, api_user_active):
    def _get_user(id):
        api_user_active._permissions[''] = ['manage_users', 'manage_templates', 'manage_settings']
        return api_user_active

    return mocker.patch(
        'app.user_api_client.get_user', side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_dont_get_user_by_email(mocker):
    def _get_user(email_address):
        return None

    return mocker.patch(
        'app.user_api_client.get_user_by_email',
        side_effect=_get_user,
        autospec=True
    )


@pytest.fixture(scope='function')
def mock_get_user_by_email_request_password_reset(mocker, api_user_request_password_reset):
    return mocker.patch(
        'app.user_api_client.get_user_by_email',
        return_value=api_user_request_password_reset)


@pytest.fixture(scope='function')
def mock_get_user_by_email_user_changed_password(mocker, api_user_changed_password):
    return mocker.patch(
        'app.user_api_client.get_user_by_email',
        return_value=api_user_changed_password)


@pytest.fixture(scope='function')
def mock_get_user_by_email_locked(mocker, api_user_locked):
    return mocker.patch(
        'app.user_api_client.get_user_by_email', return_value=api_user_locked)


@pytest.fixture(scope='function')
def mock_get_user_by_email_inactive(mocker, api_user_pending):
    return mocker.patch('app.user_api_client.get_user_by_email', return_value=api_user_pending)


@pytest.fixture(scope='function')
def mock_get_user_by_email_pending(mocker, api_user_pending):
    return mocker.patch(
        'app.user_api_client.get_user_by_email',
        return_value=api_user_pending)


@pytest.fixture(scope='function')
def mock_get_user_by_email_not_found(mocker, api_user_active):
    def _get_user(email):
        json_mock = Mock(return_value={'message': "Not found", 'result': 'error'})
        resp_mock = Mock(status_code=404, json=json_mock)
        http_error = HTTPError(response=resp_mock, message="Default message")
        raise http_error

    return mocker.patch(
        'app.user_api_client.get_user_by_email',
        side_effect=_get_user)


@pytest.fixture(scope='function')
def mock_verify_password(mocker):
    def _verify_password(user, password, login_data={}):
        return True

    return mocker.patch(
        'app.user_api_client.verify_password',
        side_effect=_verify_password)


@pytest.fixture(scope='function')
def mock_update_user_password(mocker, api_user_active):
    def _update(user_id, password):
        api_user_active['id'] = user_id
        return api_user_active

    return mocker.patch('app.user_api_client.update_password', side_effect=_update)


@pytest.fixture(scope='function')
def mock_update_user_attribute(mocker, api_user_active):
    def _update(user_id, **kwargs):
        api_user_active['id'] = user_id
        return api_user_active

    return mocker.patch('app.user_api_client.update_user_attribute', side_effect=_update)


@pytest.fixture
def mock_activate_user(mocker, api_user_active):
    def _activate(user_id):
        api_user_active['id'] = user_id
        return {'data': api_user_active}

    return mocker.patch('app.user_api_client.activate_user', side_effect=_activate)


@pytest.fixture(scope='function')
def mock_email_is_already_in_use(mocker, api_user_active):
    return mocker.patch('app.user_api_client.get_user_by_email_or_none', return_value=api_user_active)


@pytest.fixture(scope='function')
def mock_email_is_not_already_in_use(mocker):
    return mocker.patch('app.user_api_client.get_user_by_email_or_none', return_value=None)


@pytest.fixture(scope='function')
def mock_get_all_users_from_api(mocker):
    return mocker.patch('app.user_api_client.get_users', return_value={'data': []})


@pytest.fixture(scope='function')
def mock_create_api_key(mocker):
    def _create(service_id, key_name):
        return str(generate_uuid())

    return mocker.patch('app.api_key_api_client.create_api_key', side_effect=_create)


@pytest.fixture(scope='function')
def mock_revoke_api_key(mocker):
    def _revoke(service_id, key_id):
        return {}

    return mocker.patch(
        'app.api_key_api_client.revoke_api_key',
        side_effect=_revoke)


@pytest.fixture(scope='function')
def mock_get_api_keys(mocker, fake_uuid):
    def _get_keys(service_id, key_id=None):
        keys = {'apiKeys': [
            api_key_json(id_=fake_uuid, name='some key name',),
            api_key_json(id_='1234567', name='another key name', expiry_date=str(date.fromtimestamp(0)))
        ]}
        return keys

    return mocker.patch('app.api_key_api_client.get_api_keys', side_effect=_get_keys)


@pytest.fixture(scope='function')
def mock_get_no_api_keys(mocker):
    def _get_keys(service_id):
        keys = {'apiKeys': []}
        return keys

    return mocker.patch('app.api_key_api_client.get_api_keys', side_effect=_get_keys)


@pytest.fixture(scope='function')
def mock_get_ranked_api_keys(mocker):
    def _get_stats(n_days_back):
        data = [
            {
                'api_key_id': "a123456",
                'api_key_name': 'live key 1',
                'api_key_type': 'normal',
                'email_notifications': 10,
                'last_notification_created': '2020-04-04T04:53:26.474093Z',
                'service_id': "1234567",
                'service_name': 'test service 1',
                'sms_notifications': 0,
                'total_notifications': 10
            },
            {
                'api_key_id': "0123456",
                'api_key_name': 'live key 2',
                'api_key_type': 'normal',
                'email_notifications': 3,
                'last_notification_created': '2020-04-04T04:50:14.303293Z',
                'service_id': '234567',
                'service_name': 'test service 1',
                'sms_notifications': 0,
                'total_notifications': 3
            }
        ]
        return data

    return mocker.patch('app.api_key_api_client.get_api_keys_ranked_by_notifications_created', side_effect=_get_stats)


@pytest.fixture(scope='function')
def mock_get_api_key_statistics(mocker):
    def _get_stats(key_id):
        data = {
            'total_sends': 20,
            'api_key_id': key_id,
            'email_sends': 20,
            'sms_sends': 0,
            'last_send': '2020-03-16T17:32:32.883281Z'
        }
        return data

    return mocker.patch('app.api_key_api_client.get_api_key_statistics', side_effect=_get_stats)


@pytest.fixture(scope='function')
def mock_login(mocker, mock_get_user, mock_update_user_attribute, mock_events):
    def _verify_code(user_id, code, code_type):
        return True, ''

    def _no_services(params_dict=None):
        return {'data': []}

    return (
        mocker.patch(
            'app.user_api_client.check_verify_code',
            side_effect=_verify_code
        ),
        mocker.patch(
            'app.service_api_client.get_services',
            side_effect=_no_services
        )
    )


@pytest.fixture(scope='function')
def mock_send_verify_code(mocker):
    return mocker.patch('app.user_api_client.send_verify_code')


@pytest.fixture(scope='function')
def mock_send_verify_email(mocker):
    return mocker.patch('app.user_api_client.send_verify_email')


@pytest.fixture(scope='function')
def mock_check_verify_code(mocker):
    def _verify(user_id, code, code_type):
        return True, ''

    return mocker.patch(
        'app.user_api_client.check_verify_code',
        side_effect=_verify)


@pytest.fixture(scope='function')
def mock_check_verify_code_code_not_found(mocker):
    def _verify(user_id, code, code_type):
        return False, 'Code not found'

    return mocker.patch(
        'app.user_api_client.check_verify_code',
        side_effect=_verify)


@pytest.fixture(scope='function')
def mock_check_verify_code_code_expired(mocker):
    def _verify(user_id, code, code_type):
        return False, 'Code has expired'

    return mocker.patch(
        'app.user_api_client.check_verify_code',
        side_effect=_verify)


@pytest.fixture(scope='function')
def mock_create_job(mocker, api_user_active):
    def _create(job_id, service_id, scheduled_for=None):
        return job_json(
            service_id,
            api_user_active,
            job_id=job_id,
        )

    return mocker.patch('app.job_api_client.create_job', side_effect=_create)


@pytest.fixture(scope='function')
def mock_get_job(mocker, api_user_active):
    def _get_job(service_id, job_id):
        return {"data": job_json(service_id, api_user_active, job_id=job_id)}

    return mocker.patch('app.job_api_client.get_job', side_effect=_get_job)


@pytest.fixture
def mock_get_job_doesnt_exist(mocker):
    def _get_job(service_id, job_id):
        raise HTTPError(response=Mock(status_code=404, json={}), message={})

    return mocker.patch('app.job_api_client.get_job', side_effect=_get_job)


@pytest.fixture(scope='function')
def mock_get_scheduled_job(mocker, api_user_active):
    def _get_job(service_id, job_id):
        return {"data": job_json(
            service_id,
            api_user_active,
            job_id=job_id,
            job_status='scheduled',
            scheduled_for='2016-01-02T00:00:00.061258'
        )}

    return mocker.patch('app.job_api_client.get_job', side_effect=_get_job)


@pytest.fixture(scope='function')
def mock_get_cancelled_job(mocker, api_user_active):
    def _get_job(service_id, job_id):
        return {"data": job_json(
            service_id,
            api_user_active,
            job_id=job_id,
            job_status='cancelled',
            scheduled_for='2016-01-01T00:00:00.061258'
        )}

    return mocker.patch('app.job_api_client.get_job', side_effect=_get_job)


@pytest.fixture(scope='function')
def mock_get_job_in_progress(mocker, api_user_active):
    def _get_job(service_id, job_id):
        return {"data": job_json(
            service_id, api_user_active, job_id=job_id,
            notification_count=10,
            notifications_requested=5
        )}

    return mocker.patch('app.job_api_client.get_job', side_effect=_get_job)


@pytest.fixture(scope='function')
def mock_has_jobs(mocker):
    mocker.patch('app.job_api_client.has_jobs', return_value=True)


@pytest.fixture(scope='function')
def mock_has_no_jobs(mocker):
    mocker.patch('app.job_api_client.has_jobs', return_value=False)


@pytest.fixture(scope='function')
def mock_get_jobs(mocker, api_user_active):
    def _get_jobs(service_id, limit_days=None, statuses=None, page=1):
        if statuses is None:
            statuses = ['', 'scheduled', 'pending', 'cancelled', 'finished']

        jobs = [
            job_json(
                service_id,
                api_user_active,
                original_file_name=filename,
                scheduled_for=scheduled_for,
                job_status=job_status,
                template_version=template_version,
            )
            for filename, scheduled_for, job_status, template_version in (
                ('export 1/1/2016.xls', '', 'finished', 1),
                ('all email addresses.xlsx', '', 'pending', 1),
                ('applicants.ods', '', 'finished', 1),
                ('thisisatest.csv', '', 'finished', 2),
                ('send_me_later.csv', '2016-01-01 11:09:00.061258', 'scheduled', 1),
                ('even_later.csv', '2016-01-01 23:09:00.061258', 'scheduled', 1),
                ('full_of_regret.csv', '2016-01-01 23:09:00.061258', 'cancelled', 1)
            )
        ]
        return {
            'data': [job for job in jobs if job['job_status'] in statuses],
            'links': {
                'prev': 'services/{}/jobs?page={}'.format(service_id, page - 1),
                'next': 'services/{}/jobs?page={}'.format(service_id, page + 1)
            }
        }

    return mocker.patch('app.job_api_client.get_jobs', side_effect=_get_jobs)


@pytest.fixture(scope='function')
def mock_get_notifications(
    mocker,
    api_user_active,
    template_content=None,
    diff_template_type=None,
    personalisation=None,
    redact_personalisation=False,
    is_precompiled_letter=False,
    client_reference=None,
    noti_status=None,
    postage=None,
):
    def _get_notifications(
        service_id,
        job_id=None,
        page=1,
        page_size=50,
        count_pages=None,
        template_type=None,
        status=None,
        limit_days=None,
        rows=5,
        include_jobs=None,
        include_from_test_key=None,
        to=None,
        include_one_off=None,
    ):
        job = None
        if job_id is not None:
            job = job_json(service_id, api_user_active, job_id=job_id)
        if diff_template_type or template_type:
            template = template_json(
                service_id,
                id_=str(generate_uuid()),
                type_=diff_template_type or template_type[0],
                content=template_content,
                redact_personalisation=redact_personalisation,
                is_precompiled_letter=is_precompiled_letter,
            )
        else:
            template = template_json(
                service_id,
                id_=str(generate_uuid()),
                content=template_content,
                redact_personalisation=redact_personalisation,
            )
        return notification_json(
            service_id,
            template=template,
            rows=rows,
            job=job,
            with_links=True if count_pages is None else count_pages,
            personalisation=personalisation,
            template_type=diff_template_type,
            client_reference=client_reference,
            status=noti_status,
            created_by_name='Firstname Lastname',
            postage=postage
        )

    return mocker.patch(
        'app.notification_api_client.get_notifications_for_service',
        side_effect=_get_notifications
    )


@pytest.fixture(scope='function')
def mock_get_notifications_with_previous_next(mocker):
    def _get_notifications(service_id,
                           job_id=None,
                           page=1,
                           count_pages=None,
                           template_type=None,
                           status=None,
                           limit_days=None,
                           include_jobs=None,
                           include_from_test_key=None,
                           to=None,
                           include_one_off=None
                           ):
        return notification_json(service_id, rows=50, with_links=True if count_pages is None else count_pages)

    return mocker.patch(
        'app.notification_api_client.get_notifications_for_service',
        side_effect=_get_notifications
    )


@pytest.fixture(scope='function')
def mock_get_notifications_with_no_notifications(mocker):
    def _get_notifications(service_id,
                           job_id=None,
                           page=1,
                           count_pages=None,
                           template_type=None,
                           status=None,
                           limit_days=None,
                           include_jobs=None,
                           include_from_test_key=None,
                           to=None,
                           include_one_off=None
                           ):
        return notification_json(service_id, rows=0)

    return mocker.patch(
        'app.notification_api_client.get_notifications_for_service',
        side_effect=_get_notifications
    )


@pytest.fixture(scope='function')
def mock_get_inbound_sms(mocker):
    def _get_inbound_sms(
        service_id,
        user_number=None,
        page=1
    ):
        return {
            'has_next': True,
            'data': [{
                'user_number': '650253222' + str(i),
                'notify_number': '6502532229',
                'content': 'message-{}'.format(index + 1),
                'created_at': (datetime.utcnow() - timedelta(minutes=60 * (i + 1), seconds=index)).isoformat(),
                'id': sample_uuid(),
            } for index, i in enumerate([0, 0, 0, 2, 4, 6, 8, 8])]
        }

    return mocker.patch(
        'app.service_api_client.get_inbound_sms',
        side_effect=_get_inbound_sms,
    )


@pytest.fixture
def mock_get_inbound_sms_by_id_with_no_messages(mocker):
    def _get_inbound_sms_by_id(
        service_id,
        notification_id
    ):
        raise HTTPError(response=Mock(status_code=404))

    return mocker.patch(
        'app.service_api_client.get_inbound_sms_by_id',
        side_effect=_get_inbound_sms_by_id,
    )


@pytest.fixture(scope='function')
def mock_get_most_recent_inbound_sms(mocker):
    def _get_most_recent_inbound_sms(
        service_id,
        user_number=None,
        page=1
    ):
        return {
            'has_next': True,
            'data': [{
                'user_number': '650253222' + str(i),
                'notify_number': '6502532229',
                'content': 'message-{}'.format(index + 1),
                'created_at': (datetime.utcnow() - timedelta(minutes=60 * (i + 1), seconds=index)).isoformat(),
                'id': sample_uuid(),
            } for index, i in enumerate([0, 0, 0, 2, 4, 6, 8, 8])]
        }

    return mocker.patch(
        'app.service_api_client.get_most_recent_inbound_sms',
        side_effect=_get_most_recent_inbound_sms,
    )


@pytest.fixture(scope='function')
def mock_get_most_recent_inbound_sms_with_no_messages(mocker):
    def _get_most_recent_inbound_sms(
        service_id,
        user_number=None,
        page=1
    ):
        return {
            'has_next': False,
            'data': []
        }

    return mocker.patch(
        'app.service_api_client.get_most_recent_inbound_sms',
        side_effect=_get_most_recent_inbound_sms,
    )


@pytest.fixture(scope='function')
def mock_get_inbound_sms_summary(mocker):
    def _get_inbound_sms_summary(
        service_id,
    ):
        return {
            'count': 99,
            'most_recent': datetime.utcnow().isoformat()
        }

    return mocker.patch(
        'app.service_api_client.get_inbound_sms_summary',
        side_effect=_get_inbound_sms_summary,
    )


@pytest.fixture(scope='function')
def mock_get_inbound_sms_summary_with_no_messages(mocker):
    def _get_inbound_sms_summary(
        service_id,
    ):
        return {
            'count': 0,
            'latest_message': None
        }

    return mocker.patch(
        'app.service_api_client.get_inbound_sms_summary',
        side_effect=_get_inbound_sms_summary,
    )


@pytest.fixture(scope='function')
def mock_get_inbound_number_for_service(mocker):
    return mocker.patch(
        'app.inbound_number_client.get_inbound_sms_number_for_service',
        return_value={'data': {'number': '0781239871'}})


@pytest.fixture(scope='function')
def mock_no_inbound_number_for_service(mocker):
    return mocker.patch(
        'app.inbound_number_client.get_inbound_sms_number_for_service',
        return_value={'data': {}})


@pytest.fixture(scope='function')
def mock_has_permissions(mocker):
    def _has_permission(*permissions, restrict_admin_usage=False, allow_org_user=False):
        return True

    return mocker.patch(
        'app.models.user.User.has_permissions',
        side_effect=_has_permission)


@pytest.fixture(scope='function')
def mock_get_users_by_service(mocker):
    def _get_users_for_service(service_id):
        data = [{'id': sample_uuid(),
                 'logged_in_at': None,
                 'mobile_number': '+16502532222',
                 'permissions': {SERVICE_ONE_ID: ['send_texts',
                                                  'send_emails',
                                                  'send_letters',
                                                  'manage_users',
                                                  'manage_templates',
                                                  'manage_settings',
                                                  'manage_api_keys']},
                 'state': 'active',
                 'password_changed_at': str(datetime.utcnow()),
                 'name': 'Test User',
                 'email_address': 'notify@digital.cabinet-office.canada.ca',
                 'auth_type': 'sms_auth',
                 'failed_login_count': 0,
                 'organisations': [],
                 'platform_admin': False,
                 }]
        return [data[0]]

    # You shouldn’t be calling the user API client directly, so it’s the
    # instance on the model that’s mocked here
    return mocker.patch('app.models.user.Users.client', side_effect=_get_users_for_service)


@pytest.fixture(scope='function')
def mock_s3_upload(mocker):
    def _upload(service_id, filedata, region):
        return sample_uuid()

    return mocker.patch('app.main.views.send.s3upload', side_effect=_upload)


@pytest.fixture(scope='function')
def mock_s3_download(mocker, content=None):
    if not content:
        content = """
            phone number,name
            +16502532222,John
            +16502532222,Smith
        """

    def _download(service_id, upload_id):
        return content

    return mocker.patch('app.main.views.send.s3download', side_effect=_download)


@pytest.fixture(scope='function')
def mock_s3_set_metadata(mocker, content=None):
    return mocker.patch('app.main.views.send.set_metadata_on_csv_upload')


@pytest.fixture(scope='function')
def sample_invite(mocker, service_one, status='pending', permissions=None):
    id_ = USER_ONE_ID
    from_user = service_one['users'][0]
    email_address = 'invited_user@test.canada.ca'
    service_id = service_one['id']
    permissions = permissions or 'view_activity,send_messages,manage_service,manage_api_keys'
    created_at = str(datetime.utcnow())
    auth_type = 'sms_auth'
    folder_permissions = []

    return invite_json(
        id_, from_user, service_id, email_address, permissions, created_at, status, auth_type, folder_permissions)


@pytest.fixture(scope='function')
def sample_invited_user(mocker, sample_invite):
    return sample_invite


@pytest.fixture(scope='function')
def mock_create_invite(mocker, sample_invite):
    def _create_invite(from_user, service_id, email_address, permissions, folder_permissions):
        sample_invite['from_user'] = from_user
        sample_invite['service'] = service_id
        sample_invite['email_address'] = email_address
        sample_invite['status'] = 'pending'
        sample_invite['permissions'] = permissions
        sample_invite['folder_permissions'] = folder_permissions
        return sample_invite

    return mocker.patch('app.invite_api_client.create_invite', side_effect=_create_invite)


@pytest.fixture(scope='function')
def mock_get_invites_for_service(mocker, service_one, sample_invite):
    import copy

    def _get_invites(service_id):
        data = []
        for i in range(0, 5):
            invite = copy.copy(sample_invite)
            invite['email_address'] = 'user_{}@testnotify.canada.ca'.format(i)
            data.append(invite)
        return data

    return mocker.patch('app.models.user.InvitedUsers.client', side_effect=_get_invites)


@pytest.fixture(scope='function')
def mock_get_invites_without_manage_permission(mocker, service_one, sample_invite):

    def _get_invites(service_id):
        return [invite_json(
            id_=str(sample_uuid()),
            from_user=service_one['users'][0],
            email_address='invited_user@test.canada.ca',
            service_id=service_one['id'],
            permissions='view_activity,send_messages,manage_api_keys',
            created_at=str(datetime.utcnow()),
            auth_type='sms_auth',
            folder_permissions=[],
            status='pending',
        )]

    return mocker.patch('app.models.user.InvitedUsers.client', side_effect=_get_invites)


@pytest.fixture(scope='function')
def mock_check_invite_token(mocker, sample_invite):
    def _check_token(token):
        return sample_invite

    return mocker.patch('app.invite_api_client.check_token', side_effect=_check_token)


@pytest.fixture(scope='function')
def mock_accept_invite(mocker, sample_invite):
    def _accept(service_id, invite_id):
        return sample_invite

    return mocker.patch('app.invite_api_client.accept_invite', side_effect=_accept)


@pytest.fixture(scope='function')
def mock_add_user_to_service(mocker, service_one, api_user_active):
    def _add_user(service_id, user_id, permissions, folder_permissions):
        return

    return mocker.patch('app.user_api_client.add_user_to_service', side_effect=_add_user)


@pytest.fixture(scope='function')
def mock_set_user_permissions(mocker):
    return mocker.patch('app.user_api_client.set_user_permissions', return_value=None)


@pytest.fixture(scope='function')
def mock_remove_user_from_service(mocker):
    return mocker.patch('app.service_api_client.remove_user_from_service', return_value=None)


@pytest.fixture(scope='function')
def mock_get_template_statistics(mocker, service_one, fake_uuid):
    template = template_json(service_one['id'], fake_uuid, "Test template", "sms", "Something very interesting")
    data = {
        "count": 1,
        "template_name": template['name'],
        "template_type": template['template_type'],
        "template_id": template['id'],
        "is_precompiled_letter": False,
        "status": "delivered"
    }

    def _get_stats(service_id, limit_days=None):
        return [data]

    return mocker.patch(
        'app.template_statistics_client.get_template_statistics_for_service', side_effect=_get_stats)


@pytest.fixture(scope='function')
def mock_get_monthly_template_usage(mocker, service_one, fake_uuid):
    def _stats(service_id, year):
        return [{
            "template_id": fake_uuid,
            "month": 4,
            "year": year,
            "count": 2,
            "name": 'My first template',
            "type": 'sms'
        }]
    return mocker.patch(
        'app.template_statistics_client.get_monthly_template_usage_for_service',
        side_effect=_stats
    )


@pytest.fixture(scope='function')
def mock_get_monthly_notification_stats(mocker, service_one, fake_uuid):
    def _stats(service_id, year):
        return {'data': {
            datetime.utcnow().strftime('%Y-%m'): {
                "email": {
                    "sending": 1,
                    "delivered": 1,
                },
                "sms": {
                    "sending": 1,
                    "delivered": 1,
                },
                "letter": {
                    "sending": 1,
                    "delivered": 1,
                }
            }
        }}
    return mocker.patch(
        'app.service_api_client.get_monthly_notification_stats',
        side_effect=_stats
    )


@pytest.fixture(scope='function')
def mock_get_template_statistics_for_template(mocker, service_one):
    def _get_stats(service_id, template_id):
        template = template_json(service_id, template_id, "Test template", "sms", "Something very interesting")
        notification = single_notification_json(service_id, template=template)
        return notification

    return mocker.patch(
        'app.template_statistics_client.get_template_statistics_for_template', side_effect=_get_stats)


@pytest.fixture(scope='function')
def mock_get_usage(mocker, service_one, fake_uuid):
    def _get_usage(service_id, year=None):
        return [
            {"notification_type": "email", "billing_units": 1000, "rate": 0.00, "letter_total": 0},
            {"notification_type": "sms", "billing_units": 251500, "rate": 0.0165, "letter_total": 0},
            {"notification_type": "sms", "billing_units": 300, "rate": 0.0165, "letter_total": 0},
            {"notification_type": "sms", "billing_units": 300, "rate": 0.0165, "letter_total": 0},
            {"notification_type": "sms", "billing_units": 90, "rate": 0.0165, "letter_total": 0}
        ]

    return mocker.patch(
        'app.billing_api_client.get_service_usage', side_effect=_get_usage)


@pytest.fixture(scope='function')
def mock_get_billable_units(mocker):
    def _get_usage(service_id, year):
        return [
            {
                'month': 'April',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 249500,
                'postage': 'none',
            },
            {
                'month': 'April',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 100,
                'postage': 'none',
            },
            {
                'month': 'April',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 200,
                'postage': 'none',
            },
            {
                'month': 'April',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 60,
                'postage': 'none',
            },
            {
                'month': 'March',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 1000,
                'postage': 'none',
            },
            {
                'month': 'March',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 100,
                'postage': 'none',
            },
            {
                'month': 'March',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 100,
                'postage': 'none',
            },
            {
                'month': 'March',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 30,
                'postage': 'none',
            },
            {
                'month': 'February',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 1000,
                'postage': 'none',
            },
            {
                'month': 'February',
                'notification_type': 'sms',
                'rate': 0.0165,
                'billing_units': 100,
                'postage': 'none',
            },
            {
                'month': 'February',
                'notification_type': 'letter',
                'rate': 0.31,
                'billing_units': 10,
                'postage': 'second',
            },
            {
                'month': 'February',
                'notification_type': 'letter',
                'rate': 0.33,
                'billing_units': 5,
                'postage': 'first',
            }
        ]

    return mocker.patch(
        'app.billing_api_client.get_billable_units', side_effect=_get_usage)


@pytest.fixture(scope='function')
def mock_get_future_usage(mocker, service_one, fake_uuid):
    def _get_usage(service_id, year=None):
        return [
            {
                'notification_type': 'sms', 'billing_units': 0,
                'rate': 0.0158, 'letter_total': 0
            },
            {
                'notification_type': 'email', 'billing_units': 0,
                'rate': 0.0, 'letter_total': 0
            }
        ]

    return mocker.patch(
        'app.billing_api_client.get_service_usage', side_effect=_get_usage)


@pytest.fixture(scope='function')
def mock_get_future_billable_units(mocker):
    def _get_usage(service_id, year):
        return []

    return mocker.patch(
        'app.billing_api_client.get_billable_units', side_effect=_get_usage)


@pytest.fixture(scope='function')
def mock_events(mocker):
    def _create_event(event_type, event_data):
        return {'some': 'data'}

    return mocker.patch('app.events_api_client.create_event', side_effect=_create_event)


@pytest.fixture(scope='function')
def mock_send_already_registered_email(mocker):
    return mocker.patch('app.user_api_client.send_already_registered_email')


def create_email_brandings(number_of_brandings, non_standard_values={}, shuffle=False):
    brandings = [
        {
            'id': str(idx),
            'name': 'org {}'.format(idx),
            'text': 'org {}'.format(idx),
            'colour': None,
            'logo': 'logo{}.png'.format(idx),
            'brand_type': 'custom_logo',
        } for idx in range(1, number_of_brandings + 1)]

    for idx, row in enumerate(non_standard_values):
        brandings[row['idx']].update(non_standard_values[idx])

    if shuffle:
        brandings.insert(3, brandings.pop(4))

    return brandings


@pytest.fixture(scope='function')
def mock_get_all_email_branding(mocker):
    def _get_all_email_branding(sort_key=None):
        non_standard_values = [
            {'idx': 1, 'colour': 'red'},
            {'idx': 2, 'colour': 'orange'},
            {'idx': 3, 'text': None},
            {'idx': 4, 'colour': 'blue'},
        ]
        shuffle = sort_key is None
        return create_email_brandings(5, non_standard_values=non_standard_values, shuffle=shuffle)

    return mocker.patch(
        'app.notify_client.email_branding_client.email_branding_client.get_all_email_branding',
        side_effect=_get_all_email_branding,
    )


@pytest.fixture(scope='function')
def mock_get_all_letter_branding(mocker):
    def _get_letter_branding():
        return [
            {
                'id': str(UUID(int=0)),
                'name': 'HM Government',
                'filename': 'hm-government',
            },
            {
                'id': str(UUID(int=1)),
                'name': 'Land Registry',
                'filename': 'land-registry',
            },
            {
                'id': str(UUID(int=2)),
                'name': 'Animal and Plant Health Agency',
                'filename': 'animal',
            }
        ]

    return mocker.patch(
        'app.letter_branding_client.get_all_letter_branding', side_effect=_get_letter_branding
    )


@pytest.fixture
def mock_get_letter_branding_by_id(mocker):
    def _get_branding_by_id(_id):
        return {
            'id': _id,
            'name': 'HM Government',
            'filename': 'hm-government',
        }
    return mocker.patch(
        'app.letter_branding_client.get_letter_branding', side_effect=_get_branding_by_id
    )


@pytest.fixture(scope='function')
def mock_no_email_branding(mocker):
    def _get_email_branding():
        return []

    return mocker.patch(
        'app.email_branding_client.get_all_email_branding', side_effect=_get_email_branding
    )


def create_email_branding(id, non_standard_values={}):
    branding = {
        'logo': 'example.png',
        'name': 'Organisation name',
        'text': 'Organisation text',
        'id': id,
        'colour': '#f00',
        'brand_type': 'custom_logo',
    }

    if bool(non_standard_values):
        branding.update(non_standard_values)

    return {'email_branding': branding}


@pytest.fixture(scope='function')
def mock_get_email_branding(mocker, fake_uuid):
    def _get_email_branding(id):
        return create_email_branding(fake_uuid)

    return mocker.patch(
        'app.email_branding_client.get_email_branding', side_effect=_get_email_branding
    )


@pytest.fixture(scope='function')
def mock_get_email_branding_with_govuk_brand_type(mocker, fake_uuid):
    def _get_email_branding(id):
        return create_email_branding(fake_uuid, {'brand_type': 'fip_english'})

    return mocker.patch(
        'app.email_branding_client.get_email_branding', side_effect=_get_email_branding
    )


@pytest.fixture(scope='function')
def mock_get_email_branding_with_both_brand_type(mocker, fake_uuid):
    def _get_email_branding(id):
        return create_email_branding(fake_uuid, {'brand_type': 'both_english'})

    return mocker.patch(
        'app.email_branding_client.get_email_branding', side_effect=_get_email_branding
    )


@pytest.fixture(scope='function')
def mock_get_email_branding_with_custom_logo_with_background_colour_brand_type(mocker, fake_uuid):
    def _get_email_branding(id):
        return create_email_branding(fake_uuid, {'brand_type': 'custom_logo_with_background_colour'})

    return mocker.patch(
        'app.email_branding_client.get_email_branding', side_effect=_get_email_branding
    )


@pytest.fixture(scope='function')
def mock_get_email_branding_without_brand_text(mocker, fake_uuid):
    def _get_email_branding_without_brand_text(id):
        return create_email_branding(fake_uuid, {'text': '', 'brand_type': 'custom_logo_with_background_colour'})

    return mocker.patch(
        'app.email_branding_client.get_email_branding',
        side_effect=_get_email_branding_without_brand_text
    )


@pytest.fixture(scope='function')
def mock_create_email_branding(mocker):
    def _create_email_branding(logo, name, text, colour, brand_type):
        return

    return mocker.patch(
        'app.email_branding_client.create_email_branding', side_effect=_create_email_branding
    )


@pytest.fixture(scope='function')
def mock_update_email_branding(mocker):
    def _update_email_branding(branding_id, logo, name, text, colour, brand_type):
        return

    return mocker.patch(
        'app.email_branding_client.update_email_branding', side_effect=_update_email_branding
    )


@pytest.fixture(scope='function')
def mock_get_safelist(mocker):
    def _get_safelist(service_id):
        return {
            'email_addresses': ['test@example.com'],
            'phone_numbers': ['6502532222']
        }

    return mocker.patch(
        'app.service_api_client.get_safelist', side_effect=_get_safelist
    )


@pytest.fixture(scope='function')
def mock_update_safelist(mocker):
    return mocker.patch(
        'app.service_api_client.update_safelist'
    )


@pytest.fixture(scope='function')
def mock_reset_failed_login_count(mocker):
    return mocker.patch('app.user_api_client.reset_failed_login_count')


@pytest.fixture
def mock_get_notification(
    mocker,
    notification_id=fake_uuid,
    notification_status='delivered',
    redact_personalisation=False,
    template_type=None,
    template_name='sample template',
    is_precompiled_letter=False,
    key_type=None,
    postage=None,
    sent_one_off=True,
):
    def _get_notification(
        service_id,
        notification_id,
    ):
        noti = notification_json(
            service_id,
            rows=1,
            status=notification_status,
            template_type=template_type,
            postage=postage
        )['notifications'][0]

        noti['id'] = notification_id
        if sent_one_off:
            noti['created_by'] = {
                'id': fake_uuid,
                'name': 'Test User',
                'email_address': 'test@user.canada.ca'
            }
        noti['personalisation'] = {'name': 'Jo'}
        noti['template'] = template_json(
            service_id,
            '5407f4db-51c7-4150-8758-35412d42186a',
            content='hello ((name))',
            subject='blah',
            redact_personalisation=redact_personalisation,
            type_=template_type,
            is_precompiled_letter=is_precompiled_letter,
            name=template_name
        )
        if key_type:
            noti['key_type'] = key_type
        return noti

    return mocker.patch(
        'app.notification_api_client.get_notification',
        side_effect=_get_notification
    )


@pytest.fixture
def mock_send_notification(mocker, fake_uuid):
    def _send_notification(
        service_id, *, template_id, recipient, personalisation, sender_id
    ):
        return {'id': fake_uuid}

    return mocker.patch(
        'app.notification_api_client.send_notification',
        side_effect=_send_notification
    )


@pytest.fixture(scope='function')
def client(app_):
    with app_.test_request_context(), app_.test_client() as client:
        yield client


@pytest.fixture(scope='function')
def logged_in_client(
    client,
    active_user_with_permissions,
    mocker,
    service_one,
    mock_login
):
    client.login(active_user_with_permissions, mocker, service_one)
    yield client


@pytest.fixture(scope='function')
def platform_admin_client(
    client,
    platform_admin_user,
    mocker,
    service_one,
    mock_login,
):
    mock_get_user(mocker, user=platform_admin_user)
    client.login(platform_admin_user, mocker, service_one)
    yield client


@pytest.fixture
def os_environ():
    """
    clear os.environ, and restore it after the test runs
    """
    # for use whenever you expect code to edit environment variables
    old_env = os.environ.copy()
    os.environ = {}
    yield
    os.environ = old_env


@pytest.fixture
def client_request(
    logged_in_client,
    mocker,
    service_one,
):
    class ClientRequest:

        @staticmethod
        @contextmanager
        def session_transaction():
            with logged_in_client.session_transaction() as session:
                yield session

        def login(user, service=service_one):
            logged_in_client.login(user, mocker, service)

        def logout():
            logged_in_client.logout(None)

        @staticmethod
        def get(
            endpoint,
            _expected_status=200,
            _follow_redirects=False,
            _expected_redirect=None,
            _test_page_title=True,
            _optional_args="",
            **endpoint_kwargs
        ):
            return ClientRequest.get_url(
                url_for(endpoint, **(endpoint_kwargs or {})) + _optional_args,
                _expected_status=_expected_status,
                _follow_redirects=_follow_redirects,
                _expected_redirect=_expected_redirect,
                _test_page_title=_test_page_title,
            )

        @staticmethod
        def get_url(
            url,
            _expected_status=200,
            _follow_redirects=False,
            _expected_redirect=None,
            _test_page_title=True,
            **endpoint_kwargs
        ):
            resp = logged_in_client.get(
                url,
                follow_redirects=_follow_redirects,
            )
            assert resp.status_code == _expected_status, resp.location
            if _expected_redirect:
                assert resp.location == _expected_redirect
            page = BeautifulSoup(resp.data.decode('utf-8'), 'html.parser')
            if _test_page_title:
                count_of_h1s = len(page.select('h1'))
                if count_of_h1s != 1:
                    raise AssertionError('Page should have one H1 ({} found)'.format(count_of_h1s))
                page_title, h1 = (
                    normalize_spaces(page.find(selector).text) for selector in ('title', 'h1')
                )

                if not normalize_spaces(page_title).startswith(h1):
                    raise AssertionError('Page title ‘{}’ does not start with H1 ‘{}’'.format(page_title, h1))
            return page

        @staticmethod
        def post(
            endpoint,
            _data=None,
            _expected_status=None,
            _follow_redirects=False,
            _expected_redirect=None,
            **endpoint_kwargs
        ):
            if _expected_status is None:
                _expected_status = 200 if _follow_redirects else 302
            resp = logged_in_client.post(
                url_for(endpoint, **(endpoint_kwargs or {})),
                data=_data,
                follow_redirects=_follow_redirects,
            )
            assert resp.status_code == _expected_status
            if _expected_redirect:
                assert_url_expected(resp.location, _expected_redirect)
            return BeautifulSoup(resp.data.decode('utf-8'), 'html.parser')

    return ClientRequest


def normalize_spaces(input):
    if isinstance(input, str):
        return ' '.join(input.split())
    return normalize_spaces(' '.join(item.text for item in input))


@pytest.fixture(scope='function')
def mock_get_service_data_retention(mocker):
    data = {"id": str(sample_uuid()),
            "service_id": str(sample_uuid()),
            "service_name": "service name",
            "notification_type": "email",
            "days_of_retention": 7,
            "created_at": datetime.now(),
            "updated_at": None,
            }
    return mocker.patch('app.service_api_client.get_service_data_retention',
                        return_value=[data])


@pytest.fixture(scope='function')
def mock_create_service_data_retention(mocker):
    return mocker.patch('app.service_api_client.create_service_data_retention')


@pytest.fixture(scope='function')
def mock_update_service_data_retention(mocker):
    return mocker.patch('app.service_api_client.update_service_data_retention')


@pytest.fixture(scope='function')
def mock_get_free_sms_fragment_limit(mocker):
    sample_limit = 250000
    return mocker.patch('app.billing_api_client.get_free_sms_fragment_limit_for_year',
                        return_value=sample_limit)


@pytest.fixture(scope='function')
def mock_update_message_limit(mocker):
    sample_limit = 10000
    return mocker.patch('app.service_api_client.update_message_limit',
                        return_value=sample_limit)


@pytest.fixture(scope='function')
def mock_create_or_update_free_sms_fragment_limit(mocker):
    sample_limit = 250000
    return mocker.patch('app.billing_api_client.create_or_update_free_sms_fragment_limit',
                        return_value=sample_limit)


@contextmanager
def set_config(app, name, value):
    old_val = app.config.get(name)
    app.config[name] = value
    yield
    app.config[name] = old_val


@contextmanager
def set_config_values(app, dict):
    old_values = {}

    for key in dict:
        old_values[key] = app.config.get(key)
        app.config[key] = dict[key]

    yield

    for key in dict:
        app.config[key] = old_values[key]


@pytest.fixture(scope='function')
def valid_token(app_, fake_uuid):
    return generate_token(
        json.dumps({'user_id': fake_uuid, 'secret_code': 'my secret'}),
        app_.config['SECRET_KEY'],
        app_.config['DANGEROUS_SALT']
    )


@pytest.fixture(scope='function')
def mock_get_valid_service_inbound_api(mocker):
    def _get(service_id, inbound_api_id):
        return {
            'created_at': '2017-12-04T10:52:55.289026Z',
            'updated_by_id': fake_uuid,
            'id': inbound_api_id,
            'url': 'https://hello3.canada.ca',
            'service_id': service_id,
            'updated_at': '2017-12-04T11:28:42.575153Z'
        }

    return mocker.patch('app.service_api_client.get_service_inbound_api', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_valid_service_callback_api(mocker):
    def _get(service_id, callback_api_id):
        return {
            'created_at': '2017-12-04T10:52:55.289026Z',
            'updated_by_id': fake_uuid,
            'id': callback_api_id,
            'url': 'https://hello2.canada.ca',
            'service_id': service_id,
            'updated_at': '2017-12-04T11:28:42.575153Z'
        }

    return mocker.patch('app.service_api_client.get_service_callback_api', side_effect=_get)


@pytest.fixture(scope='function')
def mock_get_empty_service_inbound_api(mocker):
    return mocker.patch(
        'app.service_api_client.get_service_inbound_api',
        side_effect=lambda service_id, callback_api_id: None,
    )


@pytest.fixture(scope='function')
def mock_get_empty_service_callback_api(mocker):
    return mocker.patch(
        'app.service_api_client.get_service_callback_api',
        side_effect=lambda service_id, callback_api_id: None,
    )


@pytest.fixture(scope='function')
def mock_create_service_inbound_api(mocker):
    def _create_service_inbound_api(service_id, url, bearer_token, user_id):
        return

    return mocker.patch('app.service_api_client.create_service_inbound_api', side_effect=_create_service_inbound_api)


@pytest.fixture(scope='function')
def mock_delete_service_inbound_api(mocker):
    return mocker.patch(
        'app.service_api_client.delete_service_callback_api',
        side_effect=lambda service_id: None
    )


@pytest.fixture(scope='function')
def mock_update_service_inbound_api(mocker):
    def _update_service_inbound_api(service_id, url, bearer_token, user_id, inbound_api_id):
        return

    return mocker.patch('app.service_api_client.update_service_inbound_api', side_effect=_update_service_inbound_api)


@pytest.fixture(scope='function')
def mock_create_service_callback_api(mocker):
    def _create_service_callback_api(service_id, url, bearer_token, user_id):
        return

    return mocker.patch('app.service_api_client.create_service_callback_api', side_effect=_create_service_callback_api)


@pytest.fixture(scope='function')
def mock_delete_service_callback_api(mocker):
    return mocker.patch(
        'app.service_api_client.delete_service_callback_api',
        side_effect=lambda service_id: None
    )


@pytest.fixture(scope='function')
def mock_update_service_callback_api(mocker):
    def _update_service_callback_api(service_id, url, bearer_token, user_id, callback_api_id):
        return

    return mocker.patch('app.service_api_client.update_service_callback_api', side_effect=_update_service_callback_api)


@pytest.fixture(scope='function')
def organisation_one(api_user_active):
    return organisation_json(ORGANISATION_ID, 'organisation one', [api_user_active['id']])


@pytest.fixture(scope='function')
def mock_get_organisations(mocker):
    def _get_organisations():
        return [
            organisation_json('7aa5d4e9-4385-4488-a489-07812ba13383', 'Org 1'),
            organisation_json('7aa5d4e9-4385-4488-a489-07812ba13384', 'Org 2'),
            organisation_json('7aa5d4e9-4385-4488-a489-07812ba13385', 'Org 3'),
        ]

    mocker.patch(
        'app.models.organisation.Organisations.client',
        side_effect=_get_organisations,
    )

    return mocker.patch(
        'app.notify_client.organisations_api_client.organisations_client.get_organisations',
        side_effect=_get_organisations,
    )


@pytest.fixture(scope='function')
def mock_get_organisations_with_unusual_domains(mocker):
    def _get_organisations():
        return [
            organisation_json('7aa5d4e9-4385-4488-a489-07812ba13383', 'Org 1', domains=[
                'ldquo.net',
                'rdquo.net',
                'lsquo.net',
                'rsquo.net',
            ]),
        ]

    return mocker.patch('app.organisations_client.get_organisations', side_effect=_get_organisations)


@pytest.fixture(scope='function')
def mock_get_organisation(
    mocker,
    email_branding_id=None,
    default_branding_is_french=False,
    letter_branding_id=None,
):
    def _get_organisation(org_id):
        return organisation_json(
            org_id,
            {
                'o1': 'Org 1',
                'o2': 'Org 2',
                'o3': 'Org 3',
            }.get(org_id, 'Org 1'),
            email_branding_id=email_branding_id,
            default_branding_is_french=default_branding_is_french,
            letter_branding_id=letter_branding_id,
        )

    return mocker.patch('app.organisations_client.get_organisation', side_effect=_get_organisation)


@pytest.fixture(scope='function')
def mock_get_organisation_by_domain(
    mocker,
    name=False,
    crown=True,
    agreement_signed=False,
    organisation_type='',
):
    def _get_organisation_by_domain(org_id):
        return organisation_json(
            org_id,
            name,
            crown=crown,
            agreement_signed=agreement_signed,
            organisation_type=organisation_type,
        )

    return mocker.patch(
        'app.organisations_client.get_organisation_by_domain',
        side_effect=_get_organisation_by_domain,
    )


@pytest.fixture(scope='function')
def mock_get_service_organisation(
    mocker,
    name=False,
    crown=True,
    agreement_signed=None,
):
    def _get_service_organisation(service_id):
        return organisation_json(
            '7aa5d4e9-4385-4488-a489-07812ba13383',
            name,
            crown=crown,
            agreement_signed=agreement_signed,
        )

    return mocker.patch('app.organisations_client.get_service_organisation', side_effect=_get_service_organisation)


@pytest.fixture(scope='function')
def mock_update_service_organisation(mocker):
    def _update_service_organisation(service_id, organisation_id):
        return

    return mocker.patch(
        'app.organisations_client.update_service_organisation',
        side_effect=_update_service_organisation
    )


def _get_organisation_services(organisation_id):
    if organisation_id == 'o1':
        return [
            service_json('12345', 'service one', restricted=False),
            service_json('67890', 'service two'),
            service_json('abcde', 'service three'),
        ]
    if organisation_id == 'o2':
        return [
            service_json('12345', 'service one', restricted=False),
            service_json('67890', 'service two', restricted=False),
            service_json('abcde', 'service three'),
        ]
    return [
        service_json('12345', 'service one'),
        service_json('67890', 'service two'),
        service_json(SERVICE_ONE_ID, 'service one', [api_user_active(fake_uuid())['id']])
    ]


@pytest.fixture(scope='function')
def mock_get_organisation_services(mocker, api_user_active):
    return mocker.patch(
        'app.organisations_client.get_organisation_services',
        side_effect=_get_organisation_services
    )


@pytest.fixture(scope='function')
def mock_get_users_for_organisation(mocker):
    def _get_users_for_organisation(org_id):
        return [
            user_json(id_='1234', name='Test User 1'),
            user_json(id_='5678', name='Test User 2', email_address='testt@canada.ca'),
        ]

    return mocker.patch(
        'app.models.user.OrganisationUsers.client',
        side_effect=_get_users_for_organisation
    )


@pytest.fixture(scope='function')
def mock_get_invited_users_for_organisation(mocker, sample_org_invite):
    def _get_invited_invited_users_for_organisation(org_id):
        return [
            sample_org_invite
        ]

    return mocker.patch(
        'app.models.user.OrganisationInvitedUsers.client',
        side_effect=_get_invited_invited_users_for_organisation
    )


@pytest.fixture(scope='function')
def sample_org_invite(mocker, organisation_one, status='pending'):
    id_ = str(UUID(bytes=b'sample_org_invit', version=4))
    invited_by = organisation_one['users'][0]
    email_address = 'invited_user@test.canada.ca'
    organisation = organisation_one['id']
    created_at = str(datetime.utcnow())
    blocked = False

    return org_invite_json(id_, invited_by, organisation, email_address, created_at, status, blocked)


@pytest.fixture(scope='function')
def mock_check_org_invite_token(mocker, sample_org_invite):
    def _check_org_token(token):
        return sample_org_invite

    return mocker.patch('app.org_invite_api_client.check_token', side_effect=_check_org_token)


@pytest.fixture(scope='function')
def mock_check_org_cancelled_invite_token(mocker, sample_org_invite):
    def _check_org_token(token):
        sample_org_invite['status'] = 'cancelled'
        return sample_org_invite

    return mocker.patch('app.org_invite_api_client.check_token', side_effect=_check_org_token)


@pytest.fixture(scope='function')
def mock_check_org_accepted_invite_token(mocker, sample_org_invite):
    sample_org_invite['status'] = 'accepted'

    def _check_org_token(token):
        return sample_org_invite

    return mocker.patch('app.org_invite_api_client.check_token', return_value=sample_org_invite)


@pytest.fixture(scope='function')
def mock_accept_org_invite(mocker, sample_org_invite):
    def _accept(organisation_id, invite_id):
        return sample_org_invite

    return mocker.patch('app.org_invite_api_client.accept_invite', side_effect=_accept)


@pytest.fixture(scope='function')
def mock_add_user_to_organisation(mocker, organisation_one, api_user_active):
    def _add_user(organisation_id, user_id):
        return api_user_active

    return mocker.patch('app.user_api_client.add_user_to_organisation', side_effect=_add_user)


@pytest.fixture(scope='function')
def mock_organisation_name_is_not_unique(mocker):
    return mocker.patch('app.organisations_client.is_organisation_name_unique', return_value=False)


@pytest.fixture(scope='function')
def mock_organisation_name_is_unique(mocker):
    return mocker.patch('app.organisations_client.is_organisation_name_unique', return_value=True)


@pytest.fixture(scope='function')
def mock_update_organisation_name(mocker):
    def _update_org_name(organisation_id, name):
        return

    return mocker.patch('app.organisations_client.update_organisation_name', side_effect=_update_org_name)


@pytest.fixture(scope='function')
def mock_update_organisation(mocker):
    def _update_org(organisation_id, **kwargs):
        return

    return mocker.patch('app.organisations_client.update_organisation', side_effect=_update_org)


@pytest.fixture
def mock_get_organisations_and_services_for_user(mocker, organisation_one, api_user_active):
    def _get_orgs_and_services(user_id):
        return {
            'organisations': [],
            'services': []
        }

    return mocker.patch(
        'app.user_api_client.get_organisations_and_services_for_user',
        side_effect=_get_orgs_and_services
    )


@pytest.fixture
def mock_get_non_empty_organisations_and_services_for_user(mocker, organisation_one, api_user_active):

    def _make_services(name, trial_mode=False):
        return [{
            'name': '{} {}'.format(name, i),
            'id': SERVICE_TWO_ID,
            'restricted': trial_mode,
            'organisation': None,
        } for i in range(1, 3)]

    def _get_orgs_and_services(user_id):
        return {
            'organisations': [
                {
                    'name': 'Org 1',
                    'id': 'o1',
                    'count_of_live_services': 1,
                },
                {
                    'name': 'Org 2',
                    'id': 'o2',
                    'count_of_live_services': 2,
                },
                {
                    'name': 'Org 3',
                    'id': 'o3',
                    'count_of_live_services': 0,
                },
            ],
            'services': (
                _get_organisation_services('o1')
                + _get_organisation_services('o2')
                + _make_services('Service')
            )
        }

    return mocker.patch(
        'app.user_api_client.get_organisations_and_services_for_user',
        side_effect=_get_orgs_and_services
    )


@pytest.fixture
def mock_get_just_services_for_user(mocker, organisation_one, api_user_active):

    def _make_services(name, trial_mode=False):
        return [{
            'name': '{} {}'.format(name, i + 1),
            'id': id,
            'restricted': trial_mode,
            'organisation': None,
        } for i, id in enumerate([SERVICE_TWO_ID, SERVICE_ONE_ID])]

    def _get_orgs_and_services(user_id):
        return {
            'organisations': [],
            'services': _make_services('Service'),
        }

    return mocker.patch(
        'app.user_api_client.get_organisations_and_services_for_user',
        side_effect=_get_orgs_and_services
    )


@pytest.fixture
def mock_get_empty_organisations_and_one_service_for_user(mocker, organisation_one, api_user_active):

    def _get_orgs_and_services(user_id):
        return {
            'organisations': [],
            'services': [{
                'name': 'Only service',
                'id': SERVICE_TWO_ID,
            }]
        }

    return mocker.patch(
        'app.user_api_client.get_organisations_and_services_for_user',
        side_effect=_get_orgs_and_services
    )


@pytest.fixture
def mock_create_event(mocker):
    """
    This should be used whenever your code is calling `flask_login.login_user`
    """
    def _add_event(event_type, event_data):
        return

    return mocker.patch('app.events_api_client.create_event', side_effect=_add_event)


def url_for_endpoint_with_token(endpoint, token):
    token = token.replace('%2E', '.')
    return url_for(endpoint, token=token)


@pytest.fixture
def mock_get_template_folders(mocker):
    return mocker.patch('app.template_folder_api_client.get_template_folders', return_value=[])


@pytest.fixture
def mock_move_to_template_folder(mocker):
    return mocker.patch('app.template_folder_api_client.move_to_folder')


@pytest.fixture
def mock_create_template_folder(mocker):
    return mocker.patch('app.template_folder_api_client.create_template_folder', return_value=sample_uuid())


@pytest.fixture(scope='function')
def mock_get_service_and_organisation_counts(mocker):
    return mocker.patch('app.status_api_client.get_count_of_live_services_and_organisations', return_value={
        'organisations': 111,
        'services': 9999,
    })
