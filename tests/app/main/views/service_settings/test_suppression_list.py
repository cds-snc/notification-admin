from unittest.mock import ANY, Mock

from flask import url_for
from notifications_python_client.errors import HTTPError

from tests.conftest import SERVICE_ONE_ID


class TestSuppressionListPage:
    def test_service_suppression_list_page_renders(
        self,
        client_request,
        service_one,
    ):
        """Test that the suppression list management page renders correctly"""
        page = client_request.get("main.service_suppression_list", service_id=service_one["id"])

        assert "Remove email from suppression list" in page.text
        assert "Enter the email address to remove from the suppression list" in page.text

    def test_service_suppression_list_page_requires_manage_service_permission(
        self,
        client_request,
        service_one,
        active_user_with_permissions,
        mocker,
    ):
        """Test that the page requires manage_service permission"""
        active_user_with_permissions["permissions"][SERVICE_ONE_ID] = ["view_activity"]
        client_request.login(active_user_with_permissions)

        client_request.get("main.service_suppression_list", service_id=service_one["id"], _expected_status=403)

    def test_remove_email_from_suppression_list_success(
        self,
        client_request,
        service_one,
        mocker,
    ):
        """Test successfully removing an email from suppression list"""
        mock_remove = mocker.patch(
            "app.service_api_client.remove_email_from_suppression_list", return_value={"message": "Successfully removed"}
        )

        client_request.post(
            "main.service_suppression_list",
            service_id=service_one["id"],
            _data={"email_address": "test@example.com"},
            _expected_redirect=url_for(
                "main.service_suppression_list",
                service_id=service_one["id"],
            ),
        )

        mock_remove.assert_called_once_with(
            ANY,  # service_id is a UUID object from route
            "test@example.com",
        )

    def test_remove_email_from_suppression_list_shows_success_flash(
        self,
        client_request,
        service_one,
        mocker,
    ):
        """Test that success flash message is shown after removal"""
        mocker.patch(
            "app.service_api_client.remove_email_from_suppression_list", return_value={"message": "Successfully removed"}
        )

        page = client_request.post(
            "main.service_suppression_list",
            service_id=service_one["id"],
            _data={"email_address": "test@example.com"},
            _follow_redirects=True,
        )

        assert "Successfully removed test@example.com from the suppression list" in page.text

    def test_remove_email_from_suppression_list_not_sent_by_service(
        self,
        client_request,
        service_one,
        mocker,
    ):
        """Test error when service hasn't sent to the email"""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.json.return_value = {"message": "Service has not sent to this email"}

        mocker.patch("app.service_api_client.remove_email_from_suppression_list", side_effect=HTTPError(response=mock_response))

        page = client_request.post(
            "main.service_suppression_list",
            service_id=service_one["id"],
            _data={"email_address": "never-sent@example.com"},
            _expected_status=200,
        )

        assert "has not sent any emails" in page.text

    def test_remove_email_from_suppression_list_invalid_email_from_api(
        self,
        client_request,
        service_one,
        mocker,
    ):
        """Test error when API returns 400 for invalid email"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"message": "Invalid email address"}

        mocker.patch("app.service_api_client.remove_email_from_suppression_list", side_effect=HTTPError(response=mock_response))

        page = client_request.post(
            "main.service_suppression_list",
            service_id=service_one["id"],
            _data={"email_address": "bad-email@example.com"},
            _expected_status=200,
        )

        assert "Invalid email address" in page.text

    def test_remove_email_from_suppression_list_server_error(
        self,
        client_request,
        service_one,
        mocker,
    ):
        """Test error when API returns 500"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.json.return_value = {"message": "Internal server error"}

        mocker.patch("app.service_api_client.remove_email_from_suppression_list", side_effect=HTTPError(response=mock_response))

        page = client_request.post(
            "main.service_suppression_list",
            service_id=service_one["id"],
            _data={"email_address": "test@example.com"},
            _expected_status=200,
        )

        assert "Failed to remove email from suppression list" in page.text

    def test_remove_email_from_suppression_list_invalid_email_validation(
        self,
        client_request,
        service_one,
    ):
        """Test validation error for invalid email format"""
        page = client_request.post(
            "main.service_suppression_list",
            service_id=service_one["id"],
            _data={"email_address": "not-an-email"},
            _expected_status=200,
        )

        # Form validation should catch invalid email
        assert "error" in page.text.lower() or "valid" in page.text.lower()

    def test_remove_email_from_suppression_list_empty_email(
        self,
        client_request,
        service_one,
    ):
        """Test validation error for empty email"""
        page = client_request.post(
            "main.service_suppression_list", service_id=service_one["id"], _data={"email_address": ""}, _expected_status=200
        )

        # Form should show on page (not redirected) due to validation error
        assert "Remove email from suppression list" in page.text


class TestSuppressionListSettingsLink:
    def test_suppression_list_link_visible_in_service_settings(
        self,
        client_request,
        service_one,
        mocker,
        mock_get_free_sms_fragment_limit,
        mock_get_service_data_retention,
        no_reply_to_email_addresses,
        no_letter_contact_blocks,
        single_sms_sender,
        mock_get_service_organisation,
    ):
        """Test that suppression list link appears in service settings for email services"""
        service_one["permissions"] = ["email"]

        page = client_request.get("main.service_settings", service_id=service_one["id"])

        assert "Suppression list" in page.text
        assert url_for("main.service_suppression_list", service_id=service_one["id"]) in str(page)
