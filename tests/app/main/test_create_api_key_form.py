import uuid

import pytest
from werkzeug.datastructures import MultiDict

from app.main.forms import CreateKeyForm
from app.notify_client.api_key_api_client import ApiKeyApiClient
from tests.conftest import SERVICE_ONE_ID, set_config


class TestCreateKeyFormValidation:
    @pytest.mark.parametrize(
        "expiry_date, expected_errors",
        (
            (None, ["A key with this name already exists"]),
            ("2001-01-01 01:01:01", None),
        ),
    )
    def test_return_validation_error_when_key_name_exists(
        self,
        client,
        expiry_date,
        expected_errors,
    ):
        _existing_keys = [
            {
                "name": "some key",
                "expiry_date": expiry_date,
            },
            {
                "name": "another key",
                "expiry_date": None,
            },
        ]

        form = CreateKeyForm(_existing_keys, formdata=MultiDict([("key_name", "Some key")]))

        form.key_type.choices = [("a", "a"), ("b", "b")]
        form.validate()
        assert form.errors.get("key_name") == expected_errors

    @pytest.mark.parametrize(
        "key_type, expected_error",
        [("", "You need to choose an option"), ("invalid", "You need to choose an option")],
    )
    def test_return_validation_error_when_key_type_not_chosen(self, client, key_type, expected_error):
        form = CreateKeyForm([], formdata=MultiDict([("key_name", "Some key"), ("key_type", key_type)]))
        form.key_type.choices = [("a", "a"), ("b", "b")]
        form.validate()
        assert form.errors["key_type"] == [expected_error]

    def test_manage_templates_field_defaults_to_empty(self, client):
        form = CreateKeyForm([], formdata=MultiDict([("key_name", "Some key"), ("key_type", "a")]))
        form.key_type.choices = [("a", "a"), ("b", "b")]
        form.validate()
        assert form.permissions.data == []

    def test_manage_templates_field_is_selected_when_checked(self, client):
        form = CreateKeyForm(
            [],
            formdata=MultiDict([("key_name", "Some key"), ("key_type", "a"), ("permissions", "manage_templates")]),
        )
        form.key_type.choices = [("a", "a"), ("b", "b")]
        form.validate()
        assert form.permissions.data == ["manage_templates"]


class TestCreateApiKeyView:
    def test_create_api_key_page_shows_manage_templates_checkbox(
        self,
        app_,
        client_request,
        mock_get_api_keys,
        mock_get_live_service,
        mock_has_permissions,
    ):
        with set_config(app_, "FF_ADD_TEMPLATE_PERM", True):
            page = client_request.get("main.create_api_key", service_id=SERVICE_ONE_ID)

        checkbox = page.find("input", {"name": "permissions", "type": "checkbox"})
        assert checkbox is not None

    def test_create_api_key_with_manage_templates_permission(
        self,
        app_,
        client_request,
        api_user_active,
        mock_login,
        mock_get_api_keys,
        mock_get_live_service,
        mock_has_permissions,
        fake_uuid,
        mocker,
    ):
        key_name_from_user = "Template management key"
        key_name_fixed = "template_management_key"
        post = mocker.patch(
            "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
            return_value={"data": {"key": fake_uuid, "key_name": key_name_fixed}},
        )

        with set_config(app_, "FF_ADD_TEMPLATE_PERM", True):
            client_request.post(
                "main.create_api_key",
                service_id=SERVICE_ONE_ID,
                _data={
                    "key_name": key_name_from_user,
                    "key_type": "normal",
                    "permissions": "manage_templates",
                },
                _expected_status=200,
            )

        post.assert_called_once_with(
            url="/service/{}/api-key".format(SERVICE_ONE_ID),
            data={
                "name": key_name_from_user,
                "key_type": "normal",
                "permissions": ["manage_templates"],
                "created_by": api_user_active["id"],
            },
        )

    def test_create_api_key_without_manage_templates_permission(
        self,
        app_,
        client_request,
        api_user_active,
        mock_login,
        mock_get_api_keys,
        mock_get_live_service,
        mock_has_permissions,
        fake_uuid,
        mocker,
    ):
        key_name_from_user = "Regular key"
        key_name_fixed = "regular_key"
        post = mocker.patch(
            "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
            return_value={"data": {"key": fake_uuid, "key_name": key_name_fixed}},
        )

        with set_config(app_, "FF_ADD_TEMPLATE_PERM", True):
            client_request.post(
                "main.create_api_key",
                service_id=SERVICE_ONE_ID,
                _data={
                    "key_name": key_name_from_user,
                    "key_type": "normal",
                },
                _expected_status=200,
            )

        post.assert_called_once_with(
            url="/service/{}/api-key".format(SERVICE_ONE_ID),
            data={
                "name": key_name_from_user,
                "key_type": "normal",
                "created_by": api_user_active["id"],
            },
        )


class TestApiKeyApiClient:
    def test_get_api_key_statistics(self, mocker, api_user_active):
        api_key_id = uuid.uuid4()
        expected_url = "/api-key/{}/summary-statistics".format(api_key_id)
        client = ApiKeyApiClient()

        mock_get = mocker.patch("app.notify_client.api_key_api_client.ApiKeyApiClient.get")

        client.get_api_key_statistics(api_key_id)
        mock_get.assert_called_once_with(url=expected_url)

    def test_get_api_keys_ranked(self, mocker, api_user_active):
        n_days_back = 2
        expected_url = "/api-key/ranked-by-notifications-created/{}".format(n_days_back)
        client = ApiKeyApiClient()

        mock_get = mocker.patch("app.notify_client.api_key_api_client.ApiKeyApiClient.get")

        client.get_api_keys_ranked_by_notifications_created(n_days_back)
        mock_get.assert_called_once_with(url=expected_url)

    def test_create_api_key_with_permissions(self, mocker, api_user_active):
        service_id = uuid.uuid4()
        client = ApiKeyApiClient()

        mock_post = mocker.patch(
            "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
            return_value={"data": {"key": "secret", "key_name": "test_key"}},
        )
        mocker.patch(
            "app.notify_client.api_key_api_client._attach_current_user", side_effect=lambda d: {**d, "created_by": "user-id"}
        )

        client.create_api_key(
            service_id=str(service_id),
            key_name="test key",
            key_type="normal",
            permissions=["manage_templates"],
        )

        mock_post.assert_called_once_with(
            url="/service/{}/api-key".format(service_id),
            data={
                "name": "test key",
                "key_type": "normal",
                "permissions": ["manage_templates"],
                "created_by": "user-id",
            },
        )

    def test_create_api_key_without_permissions(self, mocker, api_user_active):
        service_id = uuid.uuid4()
        client = ApiKeyApiClient()

        mock_post = mocker.patch(
            "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
            return_value={"data": {"key": "secret", "key_name": "test_key"}},
        )
        mocker.patch(
            "app.notify_client.api_key_api_client._attach_current_user", side_effect=lambda d: {**d, "created_by": "user-id"}
        )

        client.create_api_key(
            service_id=str(service_id),
            key_name="test key",
            key_type="normal",
        )

        mock_post.assert_called_once_with(
            url="/service/{}/api-key".format(service_id),
            data={
                "name": "test key",
                "key_type": "normal",
                "created_by": "user-id",
            },
        )


class TestManageReportsPermission:
    def test_manage_reports_choice_added_when_ff_report_api_enabled(self, client):
        form = CreateKeyForm([], ff_report_api=True)
        choice_values = [value for value, _ in form.permissions.choices]
        assert "manage_reports" in choice_values

    def test_manage_reports_choice_label(self, client):
        form = CreateKeyForm([], ff_report_api=True)
        choices = dict(form.permissions.choices)
        assert choices["manage_reports"] == "Allow this key to create and download delivery reports"

    def test_manage_reports_choice_not_added_when_ff_report_api_disabled(self, client):
        form = CreateKeyForm([], ff_report_api=False)
        choice_values = [value for value, _ in form.permissions.choices]
        assert "manage_reports" not in choice_values

    def test_create_api_key_page_shows_manage_reports_checkbox_when_ff_enabled(
        self,
        app_,
        client_request,
        mock_get_api_keys,
        mock_get_live_service,
        mock_has_permissions,
    ):
        with set_config(app_, "FF_REPORT_API", True):
            page = client_request.get("main.create_api_key", service_id=SERVICE_ONE_ID)

        checkbox = page.find("input", {"name": "permissions", "value": "manage_reports", "type": "checkbox"})
        assert checkbox is not None

    def test_create_api_key_page_hides_manage_reports_checkbox_when_ff_disabled(
        self,
        app_,
        client_request,
        mock_get_api_keys,
        mock_get_live_service,
        mock_has_permissions,
    ):
        with set_config(app_, "FF_REPORT_API", False):
            page = client_request.get("main.create_api_key", service_id=SERVICE_ONE_ID)

        checkbox = page.find("input", {"name": "permissions", "value": "manage_reports", "type": "checkbox"})
        assert checkbox is None

    def test_create_api_key_with_manage_reports_permission(
        self,
        app_,
        client_request,
        api_user_active,
        mock_login,
        mock_get_api_keys,
        mock_get_live_service,
        mock_has_permissions,
        fake_uuid,
        mocker,
    ):
        key_name_from_user = "Reports key"
        key_name_fixed = "reports_key"
        post = mocker.patch(
            "app.notify_client.api_key_api_client.ApiKeyApiClient.post",
            return_value={"data": {"key": fake_uuid, "key_name": key_name_fixed}},
        )

        with set_config(app_, "FF_REPORT_API", True):
            client_request.post(
                "main.create_api_key",
                service_id=SERVICE_ONE_ID,
                _data={
                    "key_name": key_name_from_user,
                    "key_type": "normal",
                    "permissions": "manage_reports",
                },
                _expected_status=200,
            )

        post.assert_called_once_with(
            url="/service/{}/api-key".format(SERVICE_ONE_ID),
            data={
                "name": key_name_from_user,
                "key_type": "normal",
                "permissions": ["manage_reports"],
                "created_by": api_user_active["id"],
            },
        )
