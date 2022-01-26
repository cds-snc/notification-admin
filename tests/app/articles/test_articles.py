from unittest.mock import patch

import pytest

from app.articles import get_preview_url, set_active_nav_item

gc_articles_api = "articles.cdssandbox.xyz/notification-gc-notify"


class TestSetActiveNavItem:
    @pytest.fixture
    def items(self):
        items = [{"name": "home", "url": "/"}, {"name": "page 1", "url": "/page-1"}, {"name": "page 2", "url": "/page-2"}]
        return [i.copy() for i in items]

    def test_set_active_nav_item(self, items):
        set_active_nav_item(items, "/page-2")
        matching_item = next((i for i in items if i["url"] == "/page-2"), None)
        assert matching_item["active"] is True

    def test_set_no_active_nav_item(self, items):
        # url doesn't exist in items
        set_active_nav_item(items, "/page-3")
        for item in items:
            assert item["active"] is False


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
