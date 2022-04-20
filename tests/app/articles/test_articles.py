from unittest.mock import patch

import pytest

from app.articles import get_content_by_slug_or_redirect, get_lang_url, get_preview_url, set_active_nav_item

gc_articles_api = "articles.alpha.canada.ca/notification-gc-notify"


class TestSetActiveNavItem:
    @pytest.fixture
    def items(self):
        return [{"name": "home", "url": "/"}, {"name": "page 1", "url": "/page-1"}, {"name": "page 2", "url": "/page-2"}]

    def test_set_active_nav_item(self, items):
        set_active_nav_item(items, "/page-2")
        matching_item = next((i for i in items if i["url"] == "/page-2"), None)
        assert matching_item["active"] is True

    def test_set_no_active_nav_item(self, items):
        # url doesn't exist in items
        set_active_nav_item(items, "/page-3")
        for item in items:
            assert item["active"] is False


class TestGetLangURL:
    @pytest.fixture
    def response(self):
        return {"id": 1, "slug": "page-en", "id_en": 1, "id_fr": 99, "slug_en": "page-en", "slug_fr": "page-fr"}

    @patch("app.articles.get_current_locale", return_value="en")
    def test_get_lang_url_with_page_id_en(self, param, response):
        lang_url = get_lang_url(response, has_page_id=True)
        assert lang_url == "/preview?id=99"

    @patch("app.articles.get_current_locale", return_value="fr")
    def test_get_lang_url_with_page_id_fr(self, param, response):
        lang_url = get_lang_url(response, has_page_id=True)
        assert lang_url == "/preview?id=1"

    @patch("app.articles.get_current_locale", return_value="en")
    def test_get_lang_url_with_slug_en(self, param, response):
        lang_url = get_lang_url(response, has_page_id=False)
        assert lang_url == "/page-fr"

    @patch("app.articles.get_current_locale", return_value="fr")
    def test_get_lang_url_with_slug_fr(self, param, response):
        lang_url = get_lang_url(response, has_page_id=False)
        assert lang_url == "/page-en"


class TestGetLangURLNoTranslation:
    @pytest.fixture
    def response(self):
        return {
            "id": 2,
            "slug": "page-no-translation",
            "id_en": 2,
            "id_fr": None,
            "slug_en": "page-no-translation",
            "slug_fr": None,
        }

    @patch("app.articles.get_current_locale", return_value="en")
    def test_get_lang_url_with_page_id_en(self, param, response):
        lang_url = get_lang_url(response, has_page_id=True)
        assert lang_url == "/404"

    @patch("app.articles.get_current_locale", return_value="fr")
    def test_get_lang_url_with_page_id_fr(self, param, response):
        lang_url = get_lang_url(response, has_page_id=True)
        assert lang_url == "/preview?id=2"

    @patch("app.articles.get_current_locale", return_value="en")
    def test_get_lang_url_with_slug_en(self, param, response):
        lang_url = get_lang_url(response, has_page_id=False)
        assert lang_url == "/page-no-translation"

    @patch("app.articles.get_current_locale", return_value="fr")
    def test_get_lang_url_with_slug_fr(self, param, response):
        lang_url = get_lang_url(response, has_page_id=False)
        assert lang_url == "/page-no-translation"


@patch.dict("app.articles.current_app.config", values={"GC_ARTICLES_API": gc_articles_api})
class TestGetPreviewURL:
    @patch("app.articles.get_current_locale", return_value="en")
    def test_get_preview_url_en(self, param):
        page_id = 123
        preview_url = get_preview_url(page_id)

        assert preview_url == f"https://{gc_articles_api}/wp-admin/post.php?post={page_id}&action=edit&lang=en"

    @patch("app.articles.get_current_locale", return_value="fr")
    def test_get_preview_url_fr(self, param):
        page_id = 123
        preview_url = get_preview_url(page_id)

        assert preview_url == f"https://{gc_articles_api}/wp-admin/post.php?post={page_id}&action=edit&lang=fr"

    @patch("app.articles.get_current_locale", return_value="en")
    def test_get_preview_url_None_as_id(self, param):
        preview_url = get_preview_url(page_id=None)

        # return None as page_id. This should never happen in practice, since we check page_id beforehand
        assert preview_url == f"https://{gc_articles_api}/wp-admin/post.php?post=None&action=edit&lang=en"


@patch("app.articles.request_content", return_value="string_response")
@patch("app.articles.redirect")
def test_get_content_by_slug_or_redirect_string(mock_redirect, mock_request_content):
    get_content_by_slug_or_redirect("pineapple", "ananas")

    mock_request_content.assert_called_with("wp/v2/pages/", {"slug": "pineapple"}, auth_required=False)
    mock_redirect.assert_called_with("/ananas", 301)


def test_get_content_by_slug_or_redirect_dict(app_, mocker):
    response = {"title": {"rendered": "Title"}, "content": {"rendered": "Content"}, "slug_en": "slug"}
    mocker.patch("app.articles.request_content", return_value=response)
    mocker.patch("app.articles.get_nav_items", return_value="Nav Items")
    mocker.patch("app.articles.get_lang_url", return_value="Lang url")
    mocker.patch("app.articles.set_active_nav_item")
    mock_render_template = mocker.patch("app.articles.render_template")

    with app_.test_request_context():
        get_content_by_slug_or_redirect("pineapple", "ananas")

        mock_render_template.assert_called_with(
            "views/page-content.html",
            title=response["title"]["rendered"],
            html_content=response["content"]["rendered"],
            nav_items="Nav Items",
            slug=response["slug_en"],
            lang_url="Lang url",
            stats=None,
        )


@patch("app.articles.request_content", return_value=None)
@patch("app.articles.abort")
def test_get_content_by_slug_or_redirect_none(mock_abort, mock_request_content):
    get_content_by_slug_or_redirect("pineapple", "ananas")
    mock_abort.assert_called_with(404)
