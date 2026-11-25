"""Tests for the navigation module."""

from unittest.mock import Mock, patch

import pytest
from app.navigation import Navigation

from tests.conftest import ORGANISATION_ID, SERVICE_ONE_ID, normalize_spaces


class TestNavigationGetNav:
    """Test the get_nav method to ensure it returns the correct navigation based on context."""

    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_get_nav_returns_service_nav_when_service_context(self, mock_current_user, mock_get_org_id, mock_get_service_id):
        """Test that service navigation is returned when in a service context."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = True
        mock_get_service_id.return_value = SERVICE_ONE_ID
        mock_get_org_id.return_value = None

        mock_service = Mock()
        mock_service.id = SERVICE_ONE_ID

        # Mock get_service_nav to avoid needing full context
        mock_g = Mock(get=Mock(return_value=mock_service))
        with patch("app.navigation.g", mock_g):
            with patch.object(nav, "get_service_nav", return_value={"service": "nav"}) as mock_service_nav:
                result = nav.get_nav()

                # Assert
                mock_service_nav.assert_called_once()
                assert result == {"service": "nav"}

    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_get_nav_returns_user_nav_when_service_not_found(self, mock_current_user, mock_get_org_id, mock_get_service_id):
        """Test that user navigation is returned when service_id is in URL but service was not found (e.g. 404)."""
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = True
        mock_get_service_id.return_value = SERVICE_ONE_ID
        mock_get_org_id.return_value = None

        mock_g = Mock(get=Mock(return_value=None))
        with patch("app.navigation.g", mock_g):
            with patch.object(nav, "get_user_nav", return_value={"user": "nav"}) as mock_user_nav:
                result = nav.get_nav()

                mock_user_nav.assert_called_once()
                assert result == {"user": "nav"}

    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_get_nav_returns_org_nav_when_org_context(self, mock_current_user, mock_get_org_id, mock_get_service_id):
        """Test that organization navigation is returned when in an org context without service."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = True
        mock_get_service_id.return_value = None
        mock_get_org_id.return_value = ORGANISATION_ID

        # Mock get_org_nav to avoid needing full context
        with patch.object(nav, "get_org_nav", return_value={"org": "nav"}) as mock_org_nav:
            result = nav.get_nav()

            # Assert
            mock_org_nav.assert_called_once()
            assert result == {"org": "nav"}

    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_get_nav_returns_service_nav_when_both_contexts(self, mock_current_user, mock_get_org_id, mock_get_service_id):
        """Test that service navigation takes precedence when both org and service context exist."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = True
        mock_get_service_id.return_value = SERVICE_ONE_ID
        mock_get_org_id.return_value = ORGANISATION_ID

        mock_service = Mock()
        mock_service.id = SERVICE_ONE_ID

        # Mock get_service_nav to avoid needing full context
        mock_g = Mock(get=Mock(return_value=mock_service))
        with patch("app.navigation.g", mock_g):
            with patch.object(nav, "get_service_nav", return_value={"service": "nav"}) as mock_service_nav:
                result = nav.get_nav()

                # Assert
                mock_service_nav.assert_called_once()
                assert result == {"service": "nav"}

    def test_get_nav_returns_user_nav_when_no_permissions(self):
        """Test that user navigation is returned when user has no permissions."""
        # Setup
        nav = Navigation()

        with patch("app.navigation.current_user") as mock_current_user:
            # Configure the mock properly
            mock_user_instance = Mock()
            mock_user_instance.is_authenticated = True
            mock_user_instance.has_permissions = Mock(return_value=False)
            mock_current_user.return_value = mock_user_instance
            mock_current_user.is_authenticated = True
            mock_current_user.has_permissions = Mock(return_value=False)

            # Mock get_user_nav to avoid needing full context
            with patch.object(nav, "get_user_nav", return_value={"user": "nav"}) as mock_user_nav:
                result = nav.get_nav()

                # Assert
                mock_user_nav.assert_called_once()
                assert result == {"user": "nav"}

    @patch("app.navigation.current_user")
    def test_get_nav_returns_public_nav_when_not_authenticated(self, mock_current_user):
        """Test that public navigation is returned when user is not authenticated."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = False

        # Mock get_public_nav to avoid needing full context
        with patch.object(nav, "get_public_nav", return_value={"public": "nav"}) as mock_public_nav:
            result = nav.get_nav()

            # Assert
            mock_public_nav.assert_called_once()
            assert result == {"public": "nav"}

    @patch("app.navigation.url_for")
    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_service_nav_excludes_admin_panel_for_non_admin_users(
        self, mock_current_user, mock_get_org_id, mock_get_service_id, mock_url_for, app_
    ):
        """Test that non-admin users do not see the admin panel in service navigation."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = True
        mock_current_user.platform_admin = False  # Non-admin user
        mock_get_service_id.return_value = SERVICE_ONE_ID
        mock_get_org_id.return_value = None
        mock_url_for.return_value = "/service/123"

        # Set up Flask globals for current_service
        from app.models.service import Service
        from flask import g

        mock_service = Mock(spec=Service)
        mock_service.id = SERVICE_ONE_ID
        mock_service.has_jobs = True
        g.current_service = mock_service

        result = nav.get_service_nav()

        # Assert that the platform_admin item is present but with False context
        assert "platform_admin" in result
        assert result["platform_admin"]["context"] is False

    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_user_nav_excludes_admin_panel_for_non_admin_users(
        self, mock_current_user, mock_get_org_id, mock_get_service_id, app_
    ):
        """Test that non-admin users do not see the admin panel in user navigation."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = False
        mock_current_user.platform_admin = False  # Non-admin user
        mock_get_service_id.return_value = None
        mock_get_org_id.return_value = None

        result = nav.get_user_nav()

        # Assert that the platform_admin item is present but with False context
        assert "platform_admin" in result
        assert result["platform_admin"]["context"] is False

    @patch("app.navigation.url_for")
    @patch("app.navigation._get_service_id_from_view_args")
    @patch("app.navigation._get_org_id_from_view_args")
    @patch("app.navigation.current_user")
    def test_service_nav_includes_admin_panel_for_admin_users(
        self, mock_current_user, mock_get_org_id, mock_get_service_id, mock_url_for, app_
    ):
        """Test that admin users see the admin panel in service navigation."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = True
        mock_current_user.platform_admin = True  # Admin user
        mock_get_service_id.return_value = SERVICE_ONE_ID
        mock_get_org_id.return_value = None
        mock_url_for.return_value = "/service/123"

        # Set up Flask globals for current_service
        from app.models.service import Service
        from flask import g

        mock_service = Mock(spec=Service)
        mock_service.id = SERVICE_ONE_ID
        mock_service.has_jobs = True
        g.current_service = mock_service

        result = nav.get_service_nav()

        # Assert that the platform_admin item is present with True context
        assert "platform_admin" in result
        assert result["platform_admin"]["context"] is True


@pytest.mark.parametrize(
    "permissions",
    [
        ["view_activity", "send_messages", "manage_templates"],
        ["send_messages"],
    ],
)
@pytest.mark.parametrize("has_jobs", [True, False])
def test_service_nav_always_shows_sent_messages_and_bulk_sends(
    client_request,
    active_user_with_permissions,
    mock_get_service_templates,
    mock_get_template_folders,
    mocker,
    permissions,
    has_jobs,
):
    mocker.patch("app.job_api_client.has_jobs", return_value=has_jobs)
    active_user_with_permissions["permissions"][SERVICE_ONE_ID] = permissions
    client_request.login(active_user_with_permissions)

    page = client_request.get("main.choose_template", service_id=SERVICE_ONE_ID)

    labels = [normalize_spaces(a.text) for a in page.select("#proposition-links a")]
    assert labels.index("Templates") < labels.index("Sent messages") < labels.index("Bulk sends")
    assert ("Dashboard" in labels) is ("view_activity" in permissions)


@pytest.mark.parametrize(
    "endpoint, extra_args, expected_selected",
    [
        ("main.service_dashboard", {}, "Dashboard"),
        ("main.view_notifications", {"message_type": "email"}, "Sent messages"),
        ("main.view_jobs", {}, "Bulk sends"),
    ],
)
def test_service_nav_highlights_sent_messages_and_bulk_sends(
    client_request,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    mock_get_notifications,
    mock_get_service_data_retention,
    mock_get_api_keys,
    mock_get_reports,
    endpoint,
    extra_args,
    expected_selected,
):
    page = client_request.get(endpoint, service_id=SERVICE_ONE_ID, **extra_args)

    selected = [normalize_spaces(a.text) for a in page.select("#proposition-links a[aria-current=page]")]
    assert selected == [expected_selected]
