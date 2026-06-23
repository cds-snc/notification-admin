import pytest
from bs4 import BeautifulSoup
from flask import url_for

from app.articles.routing import GC_ARTICLES_ROUTES
from app.tou import show_tou_prompt


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
    """Test that FF_CARETAKER content is displayed correctly in the TOU prompt."""

    @pytest.fixture(autouse=True)
    def setUp(self, app_, api_user_active):
        self.app = app_
        self.api_user_active = api_user_active

    def test_caretaker_warning_displayed_when_flag_enabled(
        self, app_, client_request, api_user_active, mocker, mock_get_service_templates
    ):
        """Verify caretaker warning is shown when FF_CARETAKER is enabled and TOU prompt is visible."""
        # Need to set flag before making request so it's available to the template
        app_.config["FF_CARETAKER"] = True

        # Log in a user who hasn't agreed to terms (so show_tou_prompt returns True)
        with app_.test_request_context():
            with app_.test_client() as client:
                client.login(api_user_active, agree_to_terms=False)

                # Make a request to a page that uses admin_template and will show tou_prompt
                # Service dashboard uses admin_template and will show tou_prompt for users who haven't agreed to terms
                response = client.get(url_for("main.service_dashboard", service_id="596cff3a-8e80-48d2-b16d-ade45d3f0d42"))

                page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

                # Check that the caretaker warning notice is present
                notice = page.select_one("div[role='alert'][data-testid='notice']")
                assert notice is not None, "Caretaker notice should be displayed"

                # Check for the specific caretaker warning content
                notice_text = notice.get_text()
                assert "Communicating during caretaker period" in notice_text, "Caretaker warning title should be present"
                assert (
                    "Some communications are prohibited during a federal election" in notice_text
                ), "Caretaker warning message should be present"

        # Reset the flag
        app_.config["FF_CARETAKER"] = False

    def test_caretaker_warning_not_displayed_when_flag_disabled(self, app_, api_user_active, mock_get_service_templates):
        """Verify caretaker warning is NOT shown when FF_CARETAKER is disabled."""
        # Ensure flag is explicitly disabled
        app_.config["FF_CARETAKER"] = False

        with app_.test_request_context():
            with app_.test_client() as client:
                client.login(api_user_active, agree_to_terms=False)

                # Make a request to a page that uses admin_template
                response = client.get(url_for("main.service_dashboard", service_id="596cff3a-8e80-48d2-b16d-ade45d3f0d42"))

                page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

                # Check that the caretaker warning notice is NOT present
                notice_text = page.get_text()
                assert (
                    "Communicating during caretaker period" not in notice_text
                ), "Caretaker warning should not be displayed when flag is disabled"
