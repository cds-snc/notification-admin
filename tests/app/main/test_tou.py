import pytest

from app.articles.routing import GC_ARTICLES_ROUTES
from app.tou import TERMS_KEY, show_tou_prompt


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


class TestCaretakerContent:
    def test_ff_caretaker_content_displayed(self, app_, client_request):
        """Test that FF_CARETAKER content is displayed when the feature flag is enabled"""
        # Remove terms agreement from session so tou_prompt is shown
        with client_request.session_transaction() as session:
            session.pop(TERMS_KEY, None)

        # Enable the FF_CARETAKER feature flag
        app_.config["FF_CARETAKER"] = True

        # Get the choose_account page which displays tou_prompt
        page = client_request.get("main.choose_account", _test_page_title=False)

        # Verify that the caretaker notice is displayed
        assert "Communicating during caretaker period" in page.text
        assert "Some communications are prohibited during a federal election" in page.text
        assert "Guidelines" in page.text

    def test_ff_caretaker_content_not_displayed_when_disabled(self, app_, client_request):
        """Test that FF_CARETAKER content is not displayed when the feature flag is disabled"""
        # Remove terms agreement from session so tou_prompt is shown
        with client_request.session_transaction() as session:
            session.pop(TERMS_KEY, None)

        # Disable the FF_CARETAKER feature flag (default)
        app_.config["FF_CARETAKER"] = False

        # Get the choose_account page
        page = client_request.get("main.choose_account", _test_page_title=False)

        # Verify that the caretaker notice is NOT displayed
        assert "Communicating during caretaker period" not in page.text
        assert "Some communications are prohibited during a federal election" not in page.text
