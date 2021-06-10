import re

import pytest

from tests.conftest import SERVICE_ONE_ID, ClientRequest


@pytest.mark.parametrize(
    "page_name, page_menu",
    [
        ("main.service_dashboard", "Dashboard"),
        ("main.choose_template", "Templates"),
    ],
)
def test_selected_menus(
    client_request: ClientRequest,
    mocker,
    mock_get_jobs,
    mock_get_service_statistics,
    mock_get_template_statistics,
    mock_get_usage,
    mock_get_template_folders,
    mock_get_service_templates_when_no_templates_exist,
    page_name,
    page_menu,
):
    page = client_request.get(
        page_name,
        service_id=SERVICE_ONE_ID,
    )

    menus = ["Dashboard", "Templates", "Api integration", "Team members", "Settings"]

    for menu in menus:
        menu_desktop_active = page.find_all("a", {"class": "header--active"}, text=re.compile(menu))
        menu_mobile_active = page.find_all("a", {"class": "menu--active"}, text=re.compile(menu))

        assert bool(menu_desktop_active) == (page_menu == menu)
        assert bool(menu_mobile_active) == (page_menu == menu)
