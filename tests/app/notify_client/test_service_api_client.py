from unittest.mock import call
from uuid import uuid4

import pytest
from flask import g
from freezegun import freeze_time

from app import invite_api_client, service_api_client, user_api_client
from app.notify_client.service_api_client import ServiceAPIClient
from tests.conftest import SERVICE_ONE_ID

FAKE_TEMPLATE_ID = uuid4()


@pytest.fixture(autouse=True)
def mock_notify_client_check_inactive_service(mocker):
    mocker.patch("app.notify_client.NotifyAdminAPIClient.check_inactive_service")


def test_client_posts_archived_true_when_deleting_template(mocker):
    mocker.patch("app.notify_client.current_user", id="1")

    expected_data = {"archived": True, "created_by": "1"}
    expected_url = "/service/{}/template/{}".format(SERVICE_ONE_ID, FAKE_TEMPLATE_ID)

    client = ServiceAPIClient()
    mock_post = mocker.patch("app.notify_client.service_api_client.ServiceAPIClient.post")

    client.delete_service_template(SERVICE_ONE_ID, FAKE_TEMPLATE_ID)
    mock_post.assert_called_once_with(expected_url, data=expected_data)


def test_client_gets_service(mocker):
    client = ServiceAPIClient()
    mock_get = mocker.patch.object(client, "get", return_value={})

    client.get_service("foo")
    mock_get.assert_called_once_with("/service/foo")


@pytest.mark.parametrize(
    "today_only, limit_days",
    [
        (True, None),
        (False, None),
        (False, 30),
    ],
)
def test_client_gets_service_statistics(mocker, today_only, limit_days):
    client = ServiceAPIClient()
    mock_get = mocker.patch.object(client, "get", return_value={"data": {"a": "b"}})

    ret = client.get_service_statistics("foo", today_only, limit_days)

    assert ret == {"a": "b"}
    mock_get.assert_called_once_with(
        "/service/foo/statistics",
        params={"today_only": today_only, "limit_days": limit_days},
    )


@pytest.mark.parametrize("filter_heartbeat", [True, False])
def test_client_gets_stats_by_month(mocker, filter_heartbeat):
    client = ServiceAPIClient()
    mock_get = mocker.patch.object(client, "get", return_value={"data": {"a": "b"}})

    ret = client.get_stats_by_month(filter_heartbeat)

    assert ret["data"] == {"a": "b"}
    mock_get.assert_called_once_with(
        "/service/delivered-notifications-stats-by-month-data",
        params={"filter_heartbeats": filter_heartbeat},
    )


def test_client_only_updates_allowed_attributes(mocker):
    mocker.patch("app.notify_client.current_user", id="1")
    with pytest.raises(TypeError) as error:
        ServiceAPIClient().update_service("service_id", foo="bar")
    assert str(error.value) == "Not allowed to update service attributes: foo"


def test_client_creates_service_with_correct_data(
    mocker,
    active_user_with_permissions,
    fake_uuid,
):
    client = ServiceAPIClient()
    mock_post = mocker.patch.object(client, "post", return_value={"data": {"id": None}})
    mocker.patch("app.notify_client.current_user", id="123")

    client.create_service(
        "My first service",
        "central_government",
        1,
        10,
        True,
        fake_uuid,
        "test@example.com",
        False,
    )
    mock_post.assert_called_once_with(
        "/service",
        dict(
            # Autogenerated arguments
            created_by="123",
            active=True,
            # ‘service_name’ argument is coerced to ‘name’
            name="My first service",
            # The rest pass through with the same names
            organisation_type="central_government",
            message_limit=1,
            sms_daily_limit=10,
            restricted=True,
            user_id=fake_uuid,
            email_from="test@example.com",
            default_branding_is_french=False,
            organisation_notes="",
        ),
    )


@pytest.mark.parametrize(
    "template_data, extra_args, expected_count",
    (
        (
            [],
            {},
            0,
        ),
        (
            [],
            {"template_type": "email"},
            0,
        ),
        (
            [
                {"template_type": "email"},
                {"template_type": "sms"},
            ],
            {},
            2,
        ),
        (
            [
                {"template_type": "email"},
                {"template_type": "sms"},
            ],
            {"template_type": "email"},
            1,
        ),
        (
            [
                {"template_type": "email"},
                {"template_type": "sms"},
            ],
            {"template_type": "letter"},
            0,
        ),
    ),
)
def test_client_returns_count_of_service_templates(
    app_,
    mocker,
    template_data,
    extra_args,
    expected_count,
):
    mocker.patch(
        "app.service_api_client.get_service_templates",
        return_value={"data": template_data},
    )

    assert service_api_client.count_service_templates(SERVICE_ONE_ID, **extra_args) == expected_count


@pytest.mark.parametrize(
    (
        "client_method,"
        "extra_args,"
        "expected_cache_get_calls,"
        "cache_value,"
        "expected_api_calls,"
        "expected_cache_set_calls,"
        "expected_return_value,"
    ),
    [
        (
            service_api_client.get_service,
            [SERVICE_ONE_ID],
            [call("service-{}".format(SERVICE_ONE_ID))],
            b'{"data_from": "cache"}',
            [],
            [],
            {"data_from": "cache"},
        ),
        (
            service_api_client.get_service,
            [SERVICE_ONE_ID],
            [call("service-{}".format(SERVICE_ONE_ID))],
            None,
            [call("/service/{}".format(SERVICE_ONE_ID))],
            [
                call(
                    "service-{}".format(SERVICE_ONE_ID),
                    '{"data_from": "api"}',
                    ex=604800,
                )
            ],
            {"data_from": "api"},
        ),
        (
            service_api_client.get_service_template,
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID],
            [call("template-{}-version-None".format(FAKE_TEMPLATE_ID))],
            b'{"data_from": "cache"}',
            [],
            [],
            {"data_from": "cache"},
        ),
        (
            service_api_client.get_service_template,
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID],
            [call("template-{}-version-None".format(FAKE_TEMPLATE_ID))],
            None,
            [call("/service/{}/template/{}".format(SERVICE_ONE_ID, FAKE_TEMPLATE_ID))],
            [
                call(
                    "template-{}-version-None".format(FAKE_TEMPLATE_ID),
                    '{"data_from": "api"}',
                    ex=604800,
                )
            ],
            {"data_from": "api"},
        ),
        (
            service_api_client.get_service_template,
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID, 1],
            [call("template-{}-version-1".format(FAKE_TEMPLATE_ID))],
            b'{"data_from": "cache"}',
            [],
            [],
            {"data_from": "cache"},
        ),
        (
            service_api_client.get_service_template,
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID, 1],
            [call("template-{}-version-1".format(FAKE_TEMPLATE_ID))],
            None,
            [call("/service/{}/template/{}/version/1".format(SERVICE_ONE_ID, FAKE_TEMPLATE_ID))],
            [
                call(
                    "template-{}-version-1".format(FAKE_TEMPLATE_ID),
                    '{"data_from": "api"}',
                    ex=604800,
                )
            ],
            {"data_from": "api"},
        ),
        (
            service_api_client.get_service_templates,
            [SERVICE_ONE_ID],
            [call("service-{}-templates".format(SERVICE_ONE_ID))],
            b'{"data_from": "cache"}',
            [],
            [],
            {"data_from": "cache"},
        ),
        (
            service_api_client.get_service_templates,
            [SERVICE_ONE_ID],
            [call("service-{}-templates".format(SERVICE_ONE_ID))],
            None,
            [call("/service/{}/template".format(SERVICE_ONE_ID))],
            [
                call(
                    "service-{}-templates".format(SERVICE_ONE_ID),
                    '{"data_from": "api"}',
                    ex=604800,
                )
            ],
            {"data_from": "api"},
        ),
        (
            service_api_client.get_service_template_versions,
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID],
            [call("template-{}-versions".format(FAKE_TEMPLATE_ID))],
            b'{"data_from": "cache"}',
            [],
            [],
            {"data_from": "cache"},
        ),
        (
            service_api_client.get_service_template_versions,
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID],
            [call("template-{}-versions".format(FAKE_TEMPLATE_ID))],
            None,
            [call("/service/{}/template/{}/versions".format(SERVICE_ONE_ID, FAKE_TEMPLATE_ID))],
            [
                call(
                    "template-{}-versions".format(FAKE_TEMPLATE_ID),
                    '{"data_from": "api"}',
                    ex=604800,
                )
            ],
            {"data_from": "api"},
        ),
    ],
)
def test_returns_value_from_cache(
    mocker,
    client_method,
    extra_args,
    expected_cache_get_calls,
    cache_value,
    expected_return_value,
    expected_api_calls,
    expected_cache_set_calls,
):
    mock_redis_get = mocker.patch(
        "app.extensions.RedisClient.get",
        return_value=cache_value,
    )
    mock_api_get = mocker.patch(
        "app.notify_client.NotifyAdminAPIClient.get",
        return_value={"data_from": "api"},
    )
    mock_redis_set = mocker.patch(
        "app.extensions.RedisClient.set",
    )

    assert client_method(*extra_args) == expected_return_value

    assert mock_redis_get.call_args_list == expected_cache_get_calls
    assert mock_api_get.call_args_list == expected_api_calls
    assert mock_redis_set.call_args_list == expected_cache_set_calls


@pytest.mark.parametrize(
    "client, method, extra_args, extra_kwargs",
    [
        (service_api_client, "update_service", [SERVICE_ONE_ID], {"name": "foo"}),
        (
            service_api_client,
            "update_service_with_properties",
            [SERVICE_ONE_ID],
            {"properties": {}},
        ),
        (service_api_client, "archive_service", [SERVICE_ONE_ID], {}),
        (service_api_client, "suspend_service", [SERVICE_ONE_ID], {}),
        (service_api_client, "resume_service", [SERVICE_ONE_ID], {}),
        (service_api_client, "remove_user_from_service", [SERVICE_ONE_ID, ""], {}),
        (service_api_client, "update_safelist", [SERVICE_ONE_ID, {}], {}),
        (
            service_api_client,
            "create_service_inbound_api",
            [SERVICE_ONE_ID] + [""] * 3,
            {},
        ),
        (
            service_api_client,
            "update_service_inbound_api",
            [SERVICE_ONE_ID] + [""] * 4,
            {},
        ),
        (service_api_client, "add_reply_to_email_address", [SERVICE_ONE_ID, ""], {}),
        (
            service_api_client,
            "update_reply_to_email_address",
            [SERVICE_ONE_ID] + [""] * 2,
            {},
        ),
        (service_api_client, "delete_reply_to_email_address", [SERVICE_ONE_ID, ""], {}),
        (service_api_client, "add_letter_contact", [SERVICE_ONE_ID, ""], {}),
        (service_api_client, "update_letter_contact", [SERVICE_ONE_ID] + [""] * 2, {}),
        (service_api_client, "delete_letter_contact", [SERVICE_ONE_ID, ""], {}),
        (service_api_client, "add_sms_sender", [SERVICE_ONE_ID, ""], {}),
        (service_api_client, "update_sms_sender", [SERVICE_ONE_ID] + [""] * 2, {}),
        (service_api_client, "delete_sms_sender", [SERVICE_ONE_ID, ""], {}),
        (
            service_api_client,
            "update_service_callback_api",
            [SERVICE_ONE_ID] + [""] * 4,
            {},
        ),
        (
            service_api_client,
            "create_service_callback_api",
            [SERVICE_ONE_ID] + [""] * 3,
            {},
        ),
        (user_api_client, "add_user_to_service", [SERVICE_ONE_ID, uuid4(), [], []], {}),
        (invite_api_client, "accept_invite", [SERVICE_ONE_ID, uuid4()], {}),
    ],
)
def test_deletes_service_cache(
    app_,
    mock_get_user,
    mocker,
    client,
    method,
    extra_args,
    extra_kwargs,
):
    mocker.patch("app.notify_client.current_user", id="1")
    mock_redis_delete = mocker.patch("app.extensions.RedisClient.delete")
    mock_request = mocker.patch("notifications_python_client.base.BaseAPIClient.request")

    # set this to avoid the issue that our test isn't running in a real request and therefore this value won't be set
    g.current_service = None
    getattr(client, method)(*extra_args, **extra_kwargs)

    assert call("service-{}".format(SERVICE_ONE_ID)) in mock_redis_delete.call_args_list
    assert len(mock_request.call_args_list) == 1


@pytest.mark.parametrize(
    "method, extra_args, expected_cache_deletes",
    [
        (
            "create_service_template",
            ["name", "type_", "content", SERVICE_ONE_ID],
            [
                "service-{}-templates".format(SERVICE_ONE_ID),
            ],
        ),
        (
            "update_service_template",
            [FAKE_TEMPLATE_ID, "foo", "sms", "bar", SERVICE_ONE_ID],
            [
                "template-{}-versions".format(FAKE_TEMPLATE_ID),
                "template-{}-version-None".format(FAKE_TEMPLATE_ID),
                "service-{}-templates".format(SERVICE_ONE_ID),
            ],
        ),
        (
            "redact_service_template",
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID],
            [
                "template-{}-versions".format(FAKE_TEMPLATE_ID),
                "template-{}-version-None".format(FAKE_TEMPLATE_ID),
                "service-{}-templates".format(SERVICE_ONE_ID),
            ],
        ),
        (
            "update_service_template_sender",
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID, "foo"],
            [
                "template-{}-versions".format(FAKE_TEMPLATE_ID),
                "template-{}-version-None".format(FAKE_TEMPLATE_ID),
                "service-{}-templates".format(SERVICE_ONE_ID),
            ],
        ),
        (
            "update_service_template_postage",
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID, "first"],
            [
                "template-{}-versions".format(FAKE_TEMPLATE_ID),
                "template-{}-version-None".format(FAKE_TEMPLATE_ID),
                "service-{}-templates".format(SERVICE_ONE_ID),
            ],
        ),
        (
            "delete_service_template",
            [SERVICE_ONE_ID, FAKE_TEMPLATE_ID],
            [
                "template-{}-versions".format(FAKE_TEMPLATE_ID),
                "template-{}-version-None".format(FAKE_TEMPLATE_ID),
                "service-{}-templates".format(SERVICE_ONE_ID),
            ],
        ),
    ],
)
def test_deletes_caches_when_modifying_templates(
    app_,
    mock_get_user,
    mocker,
    method,
    extra_args,
    expected_cache_deletes,
):
    mocker.patch("app.notify_client.current_user", id="1")
    mock_redis_delete = mocker.patch("app.extensions.RedisClient.delete")
    mock_request = mocker.patch("notifications_python_client.base.BaseAPIClient.request")

    # set this to avoid the issue that our test isn't running in a real request and therefore this value won't be set
    g.current_service = None
    getattr(service_api_client, method)(*extra_args)

    assert mock_redis_delete.call_args_list == list(map(call, expected_cache_deletes))
    assert len(mock_request.call_args_list) == 1


@pytest.mark.parametrize(
    "redis_return, expected",
    [
        (None, False),
        ("sample", True),
    ],
)
def test_has_accepted_tos(mocker, redis_return, expected):
    mock_redis_get = mocker.patch("app.extensions.RedisClient.get", return_value=redis_return)

    assert service_api_client.has_accepted_tos(SERVICE_ONE_ID) == expected

    mock_redis_get.assert_called_once_with(f"tos-accepted-{SERVICE_ONE_ID}")


@freeze_time("2016-01-01 11:09:00.061258")
def test_accept_tos(app_, mocker, monkeypatch, logged_in_client):
    monkeypatch.setitem(app_.config, "REDIS_ENABLED", True)

    mock_redis_set = mocker.patch("app.extensions.RedisClient.set")

    service_api_client.accept_tos(SERVICE_ONE_ID)

    mock_redis_set.assert_called_once_with(
        f"tos-accepted-{SERVICE_ONE_ID}",
        "2016-01-01T11:09:00.061258",
        ex=30 * 60 * 60 * 24,  # 30 days in seconds
    )


@pytest.mark.parametrize(
    "redis_return, expected",
    [
        (None, False),
        ("sample", True),
    ],
)
def test_has_submitted_use_case(mocker, redis_return, expected):
    mock_redis_get = mocker.patch("app.extensions.RedisClient.get", return_value=redis_return)

    assert service_api_client.has_submitted_use_case(SERVICE_ONE_ID) == expected

    mock_redis_get.assert_called_once_with(f"use-case-submitted-{SERVICE_ONE_ID}")


@freeze_time("2016-01-01 11:09:00.061258")
def test_register_submit_use_case(mocker):
    mock_redis_set = mocker.patch("app.extensions.RedisClient.set")

    service_api_client.register_submit_use_case(SERVICE_ONE_ID)

    mock_redis_set.assert_called_once_with(
        f"use-case-submitted-{SERVICE_ONE_ID}",
        "2016-01-01T11:09:00.061258",
        ex=30 * 60 * 60 * 24,  # 30 days in seconds
    )


@pytest.mark.parametrize(
    "redis_return, expected",
    [
        (None, None),
        ('{"foo": 42}', {"foo": 42}),
    ],
)
def test_get_use_case_data(mocker, redis_return, expected):
    mock_redis_get = mocker.patch("app.extensions.RedisClient.get", return_value=redis_return)

    assert service_api_client.get_use_case_data(SERVICE_ONE_ID) == expected

    mock_redis_get.assert_called_once_with(f"use-case-data-{SERVICE_ONE_ID}")


def test_store_use_case_data(mocker):
    mock_redis_set = mocker.patch("app.extensions.RedisClient.set")
    mock_redis_delete = mocker.patch("app.extensions.RedisClient.delete")

    service_api_client.store_use_case_data(SERVICE_ONE_ID, {"foo": 42})

    mock_redis_set.assert_called_once_with(
        f"use-case-data-{SERVICE_ONE_ID}",
        '{"foo": 42}',
        ex=60 * 60 * 60 * 24,  # 60 days in seconds
    )
    mock_redis_delete.assert_called_once_with(f"use-case-submitted-{SERVICE_ONE_ID}")


class TestSuspendCallbackApi:
    def test_suspend_callback_api(self, mocker, active_user_with_permissions):
        service_id = str(uuid4())
        mock_post = mocker.patch("app.notify_client.service_api_client.ServiceAPIClient.post")
        ServiceAPIClient().suspend_service_callback_api(service_id, active_user_with_permissions["id"], True)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args_list[0]
        expected_url = f"/service/{service_id}/delivery-receipt-api/suspend-callback"
        expected_data = {"updated_by_id": active_user_with_permissions["id"], "suspend_unsuspend": True}
        assert args[0] == expected_url
        assert kwargs["data"] == expected_data
