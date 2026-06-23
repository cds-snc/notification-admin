import pytest

from app.articles.routing import GC_ARTICLES_ROUTES
from app.tou import show_tou_prompt
from tests.conftest import normalize_spaces, set_config


class TestShowTouPrompt:
    @pytest.fixture(autouse=True)
    def setUp(self, app_, api_user_active):
        self.app = app_
        self.api_user_active = api_user_active

    @pytest.mark.parametrize(
        "route, login, agree_to_terms, expected",
        [
            ("/", False, False, False),
            ("/", False, True, False),
            ("/", True, True, False),
            ("/", True, False, True),
            (GC_ARTICLES_ROUTES["accessibility"]["en"], False, False, False),
            (GC_ARTICLES_ROUTES["accessibility"]["en"], False, True, False),
            (GC_ARTICLES_ROUTES["accessibility"]["en"], True, True, False),
            (GC_ARTICLES_ROUTES["accessibility"]["en"], True, False, False),
            ("/contact", False, False, False),
            ("/contact", False, True, False),
            ("/contact", True, True, False),
            ("/contact", True, False, False),
        ],
    )
    def test_show_tou_prompt(self, route, login, agree_to_terms, expected, app_):
        with self.app.test_request_context(), self.app.test_client() as client:
            if login:
                client.login(self.api_user_active, agree_to_terms=agree_to_terms)
            client.get(route)
            assert show_tou_prompt() == expected


class TestFFCaretakerContent:
    """Tests to verify that FF_CARETAKER content is displayed correctly in the ToU prompt."""

    def test_ff_caretaker_content_displayed_when_enabled(self, client_request, app_, mocker):
        """When FF_CARETAKER is enabled, verify the caretaker warning content appears in the ToU prompt."""
        # Mock the necessary API calls
        mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": []})
        mocker.patch("app.user_api_client.get_user")

        # Create a user who hasn't agreed to terms yet (this will trigger the ToU prompt)
        user = {
            "id": "test-user-id",
            "name": "Test User",
            "email_address": "test@example.com",
            "mobile_number": "+1234567890",
            "password_changed_at": None,
            "failed_login_count": 0,
            "permissions": {},
            "platform_admin": False,
            "services": [],
            "organisations": [],
            "current_session_id": None,
        }

        client_request.login(user, agree_to_terms=False)

        with set_config(app_, "FF_CARETAKER", True):
            page = client_request.get("main.show_accounts_or_dashboard", _follow_redirects=True)

            # Verify the caretaker warning content is present
            assert normalize_spaces(page.select_one("h2").text) == "Communicating during caretaker period"
            assert "Some communications are prohibited during a federal election" in page.text
            assert "Guidelines" in page.text

    def test_ff_caretaker_content_not_displayed_when_disabled(self, client_request, app_, mocker):
        """When FF_CARETAKER is disabled, verify the caretaker warning content does NOT appear in the ToU prompt."""
        # Mock the necessary API calls
        mocker.patch("app.service_api_client.get_live_services_data", return_value={"data": []})
        mocker.patch("app.user_api_client.get_user")

        # Create a user who hasn't agreed to terms yet (this will trigger the ToU prompt)
        user = {
            "id": "test-user-id",
            "name": "Test User",
            "email_address": "test@example.com",
            "mobile_number": "+1234567890",
            "password_changed_at": None,
            "failed_login_count": 0,
            "permissions": {},
            "platform_admin": False,
            "services": [],
            "organisations": [],
            "current_session_id": None,
        }

        client_request.login(user, agree_to_terms=False)

        with set_config(app_, "FF_CARETAKER", False):
            page = client_request.get("main.show_accounts_or_dashboard", _follow_redirects=True)

            # Verify the caretaker warning content is NOT present
            assert "Communicating during caretaker period" not in page.text
            assert "Some communications are prohibited during a federal election" not in page.text
