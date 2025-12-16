"""Tests for the navigation module."""

from unittest.mock import patch

from app.navigation import Navigation
from tests.conftest import ORGANISATION_ID, SERVICE_ONE_ID


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

        # Mock get_service_nav to avoid needing full context
        with patch.object(nav, "get_service_nav", return_value={"service": "nav"}) as mock_service_nav:
            result = nav.get_nav()

            # Assert
            mock_service_nav.assert_called_once()
            assert result == {"service": "nav"}

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

        # Mock get_service_nav to avoid needing full context
        with patch.object(nav, "get_service_nav", return_value={"service": "nav"}) as mock_service_nav:
            result = nav.get_nav()

            # Assert
            mock_service_nav.assert_called_once()
            assert result == {"service": "nav"}

    @patch("app.navigation.current_user")
    def test_get_nav_returns_user_nav_when_no_permissions(self, mock_current_user):
        """Test that user navigation is returned when user has no permissions."""
        # Setup
        nav = Navigation()
        mock_current_user.is_authenticated = True
        mock_current_user.has_permissions.return_value = False

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
