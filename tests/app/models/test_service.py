import uuid
from unittest.mock import PropertyMock

import pytest

from app.models.service import Service
from app.models.user import User
from tests import organisation_json

INV_PARENT_FOLDER_ID = "7e979e79-d970-43a5-ac69-b625a8d147b0"
INV_CHILD_1_FOLDER_ID = "92ee1ee0-e4ee-4dcc-b1a7-a5da9ebcfa2b"
VIS_PARENT_FOLDER_ID = "bbbb222b-2b22-2b22-222b-b222b22b2222"
INV_CHILD_2_FOLDER_ID = "fafe723f-1d39-4a10-865f-e551e03d8886"


def _get_all_folders(active_user_with_permissions):
    return [
        {
            "name": "Invisible folder",
            "id": str(uuid.uuid4()),
            "parent_id": None,
            "users_with_permission": [],
        },
        {
            "name": "Parent 1 - invisible",
            "id": INV_PARENT_FOLDER_ID,
            "parent_id": None,
            "users_with_permission": [],
        },
        {
            "name": "1's Visible child",
            "id": str(uuid.uuid4()),
            "parent_id": INV_PARENT_FOLDER_ID,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "1's Invisible child",
            "id": INV_CHILD_1_FOLDER_ID,
            "parent_id": INV_PARENT_FOLDER_ID,
            "users_with_permission": [],
        },
        {
            "name": "1's Visible grandchild",
            "id": str(uuid.uuid4()),
            "parent_id": INV_CHILD_1_FOLDER_ID,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "Parent 2 - visible",
            "id": VIS_PARENT_FOLDER_ID,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "2's Visible child",
            "id": str(uuid.uuid4()),
            "parent_id": VIS_PARENT_FOLDER_ID,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "2's Invisible child",
            "id": INV_CHILD_2_FOLDER_ID,
            "parent_id": VIS_PARENT_FOLDER_ID,
            "users_with_permission": [],
        },
        {
            "name": "2's Visible grandchild",
            "id": str(uuid.uuid4()),
            "parent_id": INV_CHILD_2_FOLDER_ID,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
    ]


def test_get_user_template_folders_only_returns_folders_visible_to_user(
    app_, mock_get_template_folders, service_one, active_user_with_permissions, mocker
):
    mock_get_template_folders.return_value = _get_all_folders(
        active_user_with_permissions
    )
    service = Service(service_one)
    result = service.get_user_template_folders(User(active_user_with_permissions))
    assert result == [
        {
            "name": ["Parent 1 - invisible", "1's Visible child"],
            "id": mocker.ANY,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": [
                "Parent 1 - invisible",
                ["1's Invisible child", "1's Visible grandchild"],
            ],
            "id": mocker.ANY,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "2's Visible child",
            "id": mocker.ANY,
            "parent_id": VIS_PARENT_FOLDER_ID,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": ["2's Invisible child", "2's Visible grandchild"],
            "id": mocker.ANY,
            "parent_id": VIS_PARENT_FOLDER_ID,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "Parent 2 - visible",
            "id": VIS_PARENT_FOLDER_ID,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
    ]


def test_get_template_folders_shows_user_folders_when_user_id_passed_in(
    app_, mock_get_template_folders, service_one, active_user_with_permissions, mocker
):
    mock_get_template_folders.return_value = _get_all_folders(
        active_user_with_permissions
    )
    service = Service(service_one)
    result = service.get_template_folders(user=User(active_user_with_permissions))
    assert result == [
        {
            "name": ["Parent 1 - invisible", "1's Visible child"],
            "id": mocker.ANY,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": [
                "Parent 1 - invisible",
                ["1's Invisible child", "1's Visible grandchild"],
            ],
            "id": mocker.ANY,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
        {
            "name": "Parent 2 - visible",
            "id": VIS_PARENT_FOLDER_ID,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
    ]


def test_get_template_folders_shows_all_folders_when_user_id_not_passed_in(
    mock_get_template_folders, service_one, active_user_with_permissions, mocker
):
    mock_get_template_folders.return_value = _get_all_folders(
        active_user_with_permissions
    )
    service = Service(service_one)
    result = service.get_template_folders()
    assert result == [
        {
            "name": "Invisible folder",
            "id": mocker.ANY,
            "parent_id": None,
            "users_with_permission": [],
        },
        {
            "name": "Parent 1 - invisible",
            "id": INV_PARENT_FOLDER_ID,
            "parent_id": None,
            "users_with_permission": [],
        },
        {
            "name": "Parent 2 - visible",
            "id": VIS_PARENT_FOLDER_ID,
            "parent_id": None,
            "users_with_permission": [active_user_with_permissions["id"]],
        },
    ]


def test_organisation_type_when_services_organisation_has_no_org_type(
    mocker, service_one, organisation_one
):
    service = Service(service_one)
    mocker.patch(
        "app.organisations_client.get_service_organisation",
        return_value=organisation_one,
    )

    assert not organisation_one["organisation_type"]
    assert service.organisation_type == "central"


def test_organisation_type_when_service_and_its_org_both_have_an_org_type(
    mocker, service_one
):
    # service_one has an organisation_type of 'central'
    service = Service(service_one)
    org = organisation_json(organisation_type="local")
    mocker.patch("app.organisations_client.get_service_organisation", return_value=org)

    assert service.organisation_type == "local"


def test_has_team_members_status_no_invited_users(
    service_one, mock_get_invites_without_manage_permission, mock_get_users_by_service
):
    # 1 active with "manage_service", 1 invited without "manage_service"
    service = Service(service_one)

    assert len(service.team_members) == 2
    assert len(service.invited_users) == 1

    assert service.has_team_members_status is False


def test_has_team_members_status_in_progress(
    service_one, mock_get_invites_for_service, mock_get_users_by_service
):
    # 1 active user with "manage_service", 1 invited with "manage_service"
    assert Service(service_one).has_team_members_status == "in-progress"


def test_has_team_members_status_multiple_active_users(
    mocker, service_one, active_user_with_permissions
):
    # 2 active users with "manage_service" permission
    mocker.patch(
        "app.models.user.Users.client",
        return_value=[
            active_user_with_permissions,
            active_user_with_permissions,
        ],
    )
    service = Service(service_one)

    assert len(service.active_users) == 2

    assert service.has_team_members_status is True


def test_has_accepted_tos(mocker, service_one):
    mocked = mocker.patch("app.service_api_client.has_accepted_tos", return_value=True)

    assert Service(service_one).has_accepted_tos is True

    mocked.assert_called_once_with(service_one["id"])


def test_has_submitted_go_live(mocker, service_one, fake_uuid):
    assert not Service(service_one).has_submitted_go_live
    assert Service(service_one | {"go_live_user": fake_uuid}).has_submitted_go_live


def test_has_submitted_use_case(mocker, service_one):
    mocked = mocker.patch(
        "app.service_api_client.has_submitted_use_case", return_value=True
    )

    assert Service(service_one).has_submitted_use_case is True

    mocked.assert_called_once_with(service_one["id"])


def test_register_submit_use_case(mocker, service_one):
    mocked = mocker.patch("app.service_api_client.register_submit_use_case")

    Service(service_one).register_submit_use_case()

    mocked.assert_called_once_with(service_one["id"])


@pytest.mark.parametrize(
    "service_return, expected_step, expected_form",
    [
        (None, None, {}),
        ({"step": "step", "form_data": 42}, "step", 42),
    ],
)
def test_use_case_data(
    mocker, service_one, service_return, expected_step, expected_form
):
    mocked = mocker.patch(
        "app.service_api_client.get_use_case_data", return_value=service_return
    )

    assert Service(service_one).use_case_data == (expected_step, expected_form)

    mocked.assert_called_once_with(service_one["id"])


def test_store_use_case_data(mocker, service_one):
    mocked = mocker.patch("app.service_api_client.store_use_case_data")

    Service(service_one).store_use_case_data("step", "form data")

    mocked.assert_called_once_with(
        service_one["id"], {"step": "step", "form_data": "form data"}
    )


@pytest.mark.parametrize(
    "has_submitted_use_case, has_templates, has_team_members_status, has_accepted_tos, expected_completed",
    [
        (True, True, True, True, True),
        (True, True, "in-progress", True, False),
        (True, True, False, True, False),
    ],
)
def test_go_live_checklist(
    mocker,
    service_one,
    has_submitted_use_case,
    has_templates,
    has_team_members_status,
    has_accepted_tos,
    expected_completed,
    app_,
):
    for prop in [
        "has_submitted_use_case",
        "has_templates",
        "has_team_members_status",
        "has_accepted_tos",
    ]:
        mocker.patch(
            f"app.models.service.Service.{prop}",
            new_callable=PropertyMock,
            return_value=locals()[prop],
        )

    with app_.test_request_context():
        checklist = Service(service_one).go_live_checklist
        assert len(checklist) == 4
        assert checklist[0].keys() == set(["text", "status", "endpoint", "completed"])
        assert {
            "text": "Add a team member who can manage settings",
            "status": has_team_members_status,
            "endpoint": "main.manage_users",
            "completed": expected_completed,
        } in checklist


@pytest.mark.parametrize(
    "has_submitted_use_case, has_templates, has_team_members_status, has_accepted_tos, expected_readyness",
    [
        (True, True, True, True, True),
        (False, True, True, True, False),
        (True, False, True, True, False),
        (True, True, False, True, False),
        (True, True, True, False, False),
        (True, True, "in-progress", True, False),
    ],
)
def test_go_live_checklist_completed(
    mocker,
    service_one,
    has_submitted_use_case,
    has_templates,
    has_team_members_status,
    has_accepted_tos,
    expected_readyness,
    app_,
):
    for prop in [
        "has_submitted_use_case",
        "has_templates",
        "has_team_members_status",
        "has_accepted_tos",
    ]:
        mocker.patch(
            f"app.models.service.Service.{prop}",
            new_callable=PropertyMock,
            return_value=locals()[prop],
        )

    with app_.test_request_context():
        assert Service(service_one).go_live_checklist_completed == expected_readyness
