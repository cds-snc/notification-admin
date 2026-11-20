from unittest.mock import Mock

from flask import url_for
from notifications_python_client.errors import HTTPError

from tests import validate_route_permission
from tests.conftest import normalize_spaces


def test_service_settings_shows_suppression_list_link(
    client_request,
    service_one,
    no_reply_to_email_addresses,
    no_letter_contact_blocks,
    single_sms_sender,
    mock_get_service_organisation,
    mock_get_all_letter_branding,
    mock_get_inbound_number_for_service,
    mock_get_free_sms_fragment_limit,
    mock_get_service_data_retention,
):
    page = client_request.get("main.service_settings", service_id=service_one["id"])

    expected_link = url_for("main.service_remove_email_from_suppression_list", service_id=service_one["id"])
    link = page.select_one(f"a[href='{expected_link}']")

    assert link is not None
    assert normalize_spaces(link.text) == "Remove an email address from the suppression list"


def test_service_remove_email_from_suppression_list_page(
    client_request,
    service_one,
):
    page = client_request.get("main.service_remove_email_from_suppression_list", service_id=service_one["id"])

    assert normalize_spaces(page.find("h1").text) == "Remove an email address from the suppression list"


def test_service_remove_email_from_suppression_list_success(
    client_request,
    mocker,
    service_one,
    active_user_with_permissions,
):
    mock_remove = mocker.patch("app.service_api_client.remove_email_from_suppression_list")
    client_request.login(active_user_with_permissions, service_one)

    page = client_request.post(
        "main.service_remove_email_from_suppression_list",
        service_id=service_one["id"],
        _data={
            "email_address": "person@example.com",
            "request_details": "Recipient confirmed mailbox is active",
        },
        _follow_redirects=True,
    )

    mock_remove.assert_called_once_with(
        service_id=service_one["id"],
        email_address="person@example.com",
        user_id=active_user_with_permissions["id"],
        request_details="Recipient confirmed mailbox is active",
    )
    assert "Email address removed from suppression list" in normalize_spaces(page.text)


def test_service_remove_email_from_suppression_list_shows_api_validation_error(
    client_request,
    mocker,
    service_one,
):
    mocker.patch(
        "app.service_api_client.remove_email_from_suppression_list",
        side_effect=HTTPError(
            response=Mock(status_code=400),
            message={"email_address": ["You can only remove email addresses your service has previously emailed."]},
        ),
    )

    page = client_request.post(
        "main.service_remove_email_from_suppression_list",
        service_id=service_one["id"],
        _data={
            "email_address": "unknown@example.com",
            "request_details": "",
        },
        _expected_status=200,
    )

    assert "You can only remove email addresses your service has previously emailed." in normalize_spaces(page.text)


def test_service_remove_email_from_suppression_list_route_permissions(
    mocker,
    app_,
    client,
    api_user_active,
    service_one,
):
    validate_route_permission(
        mocker,
        app_,
        "GET",
        200,
        url_for("main.service_remove_email_from_suppression_list", service_id=service_one["id"]),
        ["manage_service"],
        api_user_active,
        service_one,
    )
