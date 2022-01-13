from app.articles import find_item_url, set_active_nav_item


def _get_items():
    items = [{"name": "home", "url": "/"}, {"name": "page 1", "url": "/page-1"}, {"name": "page 2", "url": "/page-2"}]
    return [i.copy() for i in items]


def test_find_item_url():
    items = _get_items()

    found = find_item_url(items)
    assert found is False

    found = find_item_url(items, "")
    assert found is False

    found = find_item_url(items, "/")
    assert found is True

    found = find_item_url(items, "/page-2")
    assert found is True

    # trailing slash
    found = find_item_url(items, "/page-2/")
    assert found is False

    found = find_item_url(items, "/page-2/page-1")
    assert found is False

    found = find_item_url(items, "/page-3")
    assert found is False


def test_set_active_nav_item():
    items = _get_items()

    set_active_nav_item(items, "/page-2")
    matching_item = next((i for i in items if i["url"] == "/page-2"), None)
    assert matching_item["active"] is True


def test_set_no_active_nav_item():
    items = _get_items()

    # url doesn't exist in items
    set_active_nav_item(items, "/page-3")
    for item in items:
        assert item["active"] is False
