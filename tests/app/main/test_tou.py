import pytest

from app.articles.routing import GC_ARTICLES_ROUTES
from app.tou import show_tou_prompt
from tests.conftest import set_config


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
            with set_config(app_, "FF_TOU", True): # remove this line when FF is removed
                if login:
                    client.login(self.api_user_active, agree_to_terms=agree_to_terms)
                client.get(route)
                assert show_tou_prompt() == expected
