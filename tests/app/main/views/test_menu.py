import re
import uuid

import pytest

from tests.conftest import SERVICE_ONE_ID, ClientRequest, create_notifications


@pytest.mark.parametrize(
    "page_name, page_menu",
    [
        ("main.service_dashboard", "Dashboard"),
        ("main.choose_template", "Templates"),
        ("main.api_integration", "API integration"),
        ("main.manage_users", "Team members"),
        ("main.service_settings", "Settings")
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
    mock_get_invites_for_service,
    mock_get_service_templates,
    mock_get_inbound_sms_summary,
    mock_get_free_sms_fragment_limit,
    mock_get_all_letter_branding,
    mock_get_inbound_number_for_service,
    mock_get_service_data_retention,
    single_reply_to_email_address,
    single_letter_contact_block,
    mock_get_service_organisation,
    single_sms_sender,
    active_user_view_permissions,
    active_caseworking_user,
    page_name,
    page_menu,
):
    # mocks for manage_users
    current_user = active_user_view_permissions
    other_user = active_caseworking_user
    other_user["id"] = uuid.uuid4()
    other_user["email_address"] = "zzzzzzz@example.canada.ca"
    mocker.patch("app.user_api_client.get_user", return_value=current_user)
    mocker.patch(
        "app.models.user.Users.client",
        return_value=[
            current_user,
            other_user,
        ],
    )

    #mocks for api_integration
    notifications = create_notifications(template_type="EMAIL")
    mocker.patch("app.notification_api_client.get_api_notifications_for_service", return_value=notifications)
    
    page = client_request.get(
        page_name,
        service_id=SERVICE_ONE_ID,
    )

    menus = ["Dashboard", "Templates", "API integration", "Team members", "Settings"]

    for menu in menus:
        menu_desktop_active = page.find_all("a", {"aria-current": "page"}, text=re.compile(menu))
        menu_mobile_active = page.find_all("a", {"aria-current": "page"}, text=re.compile(menu))

        assert bool(menu_desktop_active) == (page_menu == menu)
        assert bool(menu_mobile_active) == (page_menu == menu)
