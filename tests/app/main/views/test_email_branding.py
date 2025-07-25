from io import BytesIO
from unittest import mock
from unittest.mock import call, patch

import pytest
from bs4 import BeautifulSoup
from flask import url_for
from flask_login import current_user
from notifications_python_client.errors import HTTPError

from app.main.views.email_branding import get_preview_template
from app.s3_client.s3_logo_client import EMAIL_LOGO_LOCATION_STRUCTURE, TEMP_TAG
from app.utils import get_logo_cdn_domain
from tests import sample_uuid
from tests.conftest import create_email_branding, normalize_spaces


def test_email_branding_page_shows_full_branding_list(platform_admin_client, mock_get_all_email_branding):
    response = platform_admin_client.get(url_for(".email_branding"))

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    links = page.select(".email-brand a")
    brand_names = [normalize_spaces(link.text) for link in links]
    hrefs = [link["href"] for link in links]

    assert normalize_spaces(page.select_one("h1").text) == "Email branding"

    assert page.select_one("#create_email_branding")["href"] == url_for("main.create_email_branding")

    assert brand_names == [
        "org 1",
        "org 2",
        "org 3",
        "org 4",
        "org 5",
    ]
    assert hrefs == [
        url_for(".update_email_branding", branding_id=1),
        url_for(".update_email_branding", branding_id=2),
        url_for(".update_email_branding", branding_id=3),
        url_for(".update_email_branding", branding_id=4),
        url_for(".update_email_branding", branding_id=5),
    ]


def test_edit_email_branding_shows_the_correct_branding_info(
    platform_admin_client, mock_get_email_branding, mock_get_organisations, fake_uuid
):
    response = platform_admin_client.get(url_for(".update_email_branding", branding_id=fake_uuid))

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    assert page.select_one("#logo-img > img")["src"].endswith("/example.png")
    assert page.select_one("#name").attrs.get("value") == "Organisation name"
    assert page.select_one("#text").attrs.get("value") == "Organisation text"
    assert page.select_one("#colour").attrs.get("value") == "#f00"
    assert page.select_one("#alt_text_en").attrs.get("value") == "Alt text english"
    assert page.select_one("#alt_text_fr").attrs.get("value") == "Alt text french"


def test_create_email_branding_does_not_show_any_branding_info(
    platform_admin_client, mock_no_email_branding, mock_get_organisations
):
    response = platform_admin_client.get(url_for(".create_email_branding"))

    assert response.status_code == 200
    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    assert page.select_one("#logo-img > img") is None
    assert page.select_one("#name").attrs.get("value") == ""
    assert page.select_one("#text").attrs.get("value") == ""
    assert page.select_one("#colour").attrs.get("value") == ""


def test_create_new_email_branding_without_logo(
    platform_admin_client,
    mocker,
    fake_uuid,
    mock_create_email_branding,
    mock_get_organisations,
):
    data = {
        "logo": None,
        "colour": "#ff0000",
        "text": "new text",
        "name": "new name",
        "brand_type": "custom_logo",
        "alt_text_en": "Alt text english",
        "alt_text_fr": "Alt text french",
    }

    mock_persist = mocker.patch("app.main.views.email_branding.persist_logo")
    mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

    platform_admin_client.post(url_for(".create_email_branding"), content_type="multipart/form-data", data=data)

    assert mock_create_email_branding.called
    assert mock_create_email_branding.call_args == call(
        logo=data["logo"],
        name=data["name"],
        text=data["text"],
        colour=data["colour"],
        brand_type=data["brand_type"],
        organisation_id=None,
        alt_text_en=data["alt_text_en"],
        alt_text_fr=data["alt_text_fr"],
        created_by_id=sample_uuid(),
    )
    assert mock_persist.call_args_list == []


def test_create_email_branding_requires_a_name_when_submitting_logo_details(
    client_request, mocker, mock_create_email_branding, platform_admin_user, mock_get_organisations
):
    mocker.patch("app.main.views.email_branding.persist_logo")
    mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")
    data = {
        "operation": "email-branding-details",
        "logo": "",
        "colour": "#ff0000",
        "text": "new text",
        "name": "",
        "brand_type": "custom_logo",
    }
    client_request.login(platform_admin_user)
    page = client_request.post(
        ".create_email_branding",
        content_type="multipart/form-data",
        _data=data,
        _expected_status=200,
    )

    assert page.select_one(".error-message").text.strip() == "This field is required"
    assert mock_create_email_branding.called is False


def test_create_email_branding_does_not_require_a_name_when_uploading_a_file(
    client_request, mocker, platform_admin_user, mock_get_organisations
):
    mocker.patch("app.main.views.email_branding.upload_email_logo", return_value="temp_filename")
    data = {
        "file": (BytesIO("".encode("utf-8")), "test.png"),
        "colour": "",
        "text": "",
        "name": "",
        "brand_type": "custom_logo",
    }
    client_request.login(platform_admin_user)
    page = client_request.post(
        ".create_email_branding",
        content_type="multipart/form-data",
        _data=data,
        _follow_redirects=True,
    )

    assert not page.find(".error-message")


def test_create_new_email_branding_when_branding_saved(
    platform_admin_client, mocker, mock_create_email_branding, fake_uuid, mock_get_organisations
):
    with platform_admin_client.session_transaction() as session:
        user_id = session["user_id"]

    data = {
        "logo": "test.png",
        "colour": "#ff0000",
        "text": "new text",
        "name": "new name",
        "brand_type": "custom_logo_with_background_colour",
        "alt_text_en": "Alt text english",
        "alt_text_fr": "Alt text french",
    }

    temp_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
        temp=TEMP_TAG.format(user_id=user_id),
        unique_id=fake_uuid,
        filename=data["logo"],
    )

    mocker.patch("app.main.views.email_branding.persist_logo")
    mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

    platform_admin_client.post(
        url_for(".create_email_branding", logo=temp_filename),
        content_type="multipart/form-data",
        data={
            "colour": data["colour"],
            "name": data["name"],
            "text": data["text"],
            "cdn_url": get_logo_cdn_domain(),
            "brand_type": data["brand_type"],
            "organisation": "-1",
            "alt_text_en": data["alt_text_en"],
            "alt_text_fr": data["alt_text_fr"],
        },
    )

    updated_logo_name = "{}-{}".format(fake_uuid, data["logo"])

    assert mock_create_email_branding.called
    assert mock_create_email_branding.call_args == call(
        logo=updated_logo_name,
        name=data["name"],
        text=data["text"],
        colour=data["colour"],
        brand_type=data["brand_type"],
        organisation_id=None,
        alt_text_en=data["alt_text_en"],
        alt_text_fr=data["alt_text_fr"],
        created_by_id=sample_uuid(),
    )


@pytest.mark.parametrize(
    "endpoint, has_data",
    [
        ("main.create_email_branding", False),
        ("main.update_email_branding", True),
    ],
)
def test_deletes_previous_temp_logo_after_uploading_logo(
    platform_admin_client, mocker, mock_get_all_email_branding, endpoint, has_data, fake_uuid, mock_get_organisations
):
    if has_data:
        mocker.patch("app.email_branding_client.get_email_branding", return_value=create_email_branding(fake_uuid))

    with platform_admin_client.session_transaction() as session:
        user_id = session["user_id"]

    temp_old_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
        temp=TEMP_TAG.format(user_id=user_id),
        unique_id=fake_uuid,
        filename="old_test.png",
    )

    temp_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
        temp=TEMP_TAG.format(user_id=user_id), unique_id=fake_uuid, filename="test.png"
    )

    mocked_upload_email_logo = mocker.patch("app.main.views.email_branding.upload_email_logo", return_value=temp_filename)

    mocked_delete_email_temp_file = mocker.patch("app.main.views.email_branding.delete_email_temp_file")

    platform_admin_client.post(
        url_for("main.create_email_branding", logo=temp_old_filename, branding_id=fake_uuid),
        data={"file": (BytesIO("".encode("utf-8")), "test.png")},
        content_type="multipart/form-data",
    )

    assert mocked_upload_email_logo.called
    assert mocked_delete_email_temp_file.called
    assert mocked_delete_email_temp_file.call_args == call(temp_old_filename)


def test_update_existing_branding(
    platform_admin_client,
    mocker,
    fake_uuid,
    mock_update_email_branding,
    mock_get_organisations,
):
    with platform_admin_client.session_transaction() as session:
        user_id = session["user_id"]

    data = {
        "logo": "test.png",
        "colour": "#0000ff",
        "text": "new text",
        "name": "new name",
        "organisation_id": None,
        "brand_type": "both_english",
        "alt_text_en": "Alt text english",
        "alt_text_fr": "Alt text french yolo",
    }

    with mock.patch("app.main.views.email_branding.email_branding_client.get_email_branding") as mock_get_email_branding:
        mock_get_email_branding.return_value = {
            "email_branding": {
                "logo": "example.png",
                "name": "Organisation name",
                "text": "Organisation text",
                "id": fake_uuid,
                "colour": "#f00",
                "brand_type": "custom_logo",
                "organisation_id": "",  # Test that we can set alt text when no org is set
                "alt_text_en": "Alt text english",
                "alt_text_fr": "Alt text french",
            }
        }

        temp_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
            temp=TEMP_TAG.format(user_id=user_id),
            unique_id=fake_uuid,
            filename=data["logo"],
        )

        mocker.patch("app.main.views.email_branding.persist_logo")
        mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

        platform_admin_client.post(
            url_for(".update_email_branding", logo=temp_filename, branding_id=fake_uuid),
            content_type="multipart/form-data",
            data={
                "colour": data["colour"],
                "name": data["name"],
                "text": data["text"],
                "cdn_url": get_logo_cdn_domain(),
                "brand_type": data["brand_type"],
                "alt_text_en": data["alt_text_en"],
                "alt_text_fr": data["alt_text_fr"],
                "updated_by_id": sample_uuid(),
            },
        )

        updated_logo_name = "{}-{}".format(fake_uuid, data["logo"])

        assert mock_update_email_branding.called
        assert mock_update_email_branding.call_args == call(
            branding_id=fake_uuid,
            logo=updated_logo_name,
            name=data["name"],
            text=data["text"],
            colour=data["colour"],
            brand_type=data["brand_type"],
            organisation_id=data["organisation_id"],
            alt_text_en=data["alt_text_en"],
            alt_text_fr=data["alt_text_fr"],
            updated_by_id=sample_uuid(),
        )


def test_temp_logo_is_shown_after_uploading_logo(
    platform_admin_client,
    mocker,
    fake_uuid,
    mock_get_organisations,
):
    with platform_admin_client.session_transaction() as session:
        user_id = session["user_id"]

    temp_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
        temp=TEMP_TAG.format(user_id=user_id), unique_id=fake_uuid, filename="test.png"
    )

    mocker.patch("app.main.views.email_branding.upload_email_logo", return_value=temp_filename)
    mocker.patch("app.main.views.email_branding.delete_email_temp_file")

    response = platform_admin_client.post(
        url_for("main.create_email_branding"),
        data={"file": (BytesIO("".encode("utf-8")), "test.png"), "organisation": "-1"},
        content_type="multipart/form-data",
        follow_redirects=True,
    )

    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

    assert page.select_one("#logo-img > img").attrs["src"].endswith(temp_filename)


def test_logo_persisted_when_organisation_saved(
    platform_admin_client, mock_create_email_branding, mocker, fake_uuid, mock_get_organisations
):
    with platform_admin_client.session_transaction() as session:
        user_id = session["user_id"]

    temp_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
        temp=TEMP_TAG.format(user_id=user_id), unique_id=fake_uuid, filename="test.png"
    )

    mocked_upload_email_logo = mocker.patch("app.main.views.email_branding.upload_email_logo")
    mocked_persist_logo = mocker.patch("app.main.views.email_branding.persist_logo")
    mocked_delete_email_temp_files_by = mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

    resp = platform_admin_client.post(
        url_for(".create_email_branding", logo=temp_filename),
        content_type="multipart/form-data",
    )
    assert resp.status_code == 302

    assert not mocked_upload_email_logo.called
    assert mocked_persist_logo.called
    assert mocked_delete_email_temp_files_by.called
    assert mocked_delete_email_temp_files_by.call_args == call(user_id)
    assert mock_create_email_branding.called


def test_logo_does_not_get_persisted_if_updating_email_branding_client_throws_an_error(
    platform_admin_client, mock_create_email_branding, mocker, fake_uuid
):
    with platform_admin_client.session_transaction() as session:
        user_id = session["user_id"]

    temp_filename = EMAIL_LOGO_LOCATION_STRUCTURE.format(
        temp=TEMP_TAG.format(user_id=user_id), unique_id=fake_uuid, filename="test.png"
    )

    mocked_persist_logo = mocker.patch("app.main.views.email_branding.persist_logo")
    mocked_delete_email_temp_files_by = mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")
    mocker.patch(
        "app.main.views.email_branding.email_branding_client.create_email_branding",
        side_effect=HTTPError(),
    )

    platform_admin_client.post(
        url_for(".create_email_branding", logo=temp_filename),
        content_type="multipart/form-data",
    )

    assert not mocked_persist_logo.called
    assert not mocked_delete_email_temp_files_by.called


@pytest.mark.parametrize(
    "colour_hex, expected_status_code",
    [
        ("#FF00FF", 302),
        ("hello", 200),
        ("", 302),
    ],
)
def test_colour_regex_validation(
    platform_admin_client, mocker, fake_uuid, colour_hex, expected_status_code, mock_create_email_branding, mock_get_organisations
):
    data = {
        "logo": None,
        "colour": colour_hex,
        "text": "new text",
        "name": "new name",
        "brand_type": "custom_logo",
    }

    mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

    response = platform_admin_client.post(url_for(".create_email_branding"), content_type="multipart/form-data", data=data)
    assert response.status_code == expected_status_code


def test_create_new_branding_with_no_org_works(
    platform_admin_client, mocker, fake_uuid, mock_create_email_branding, mock_get_organisations
):
    data = {
        "logo": None,
        "colour": "#ff0000",
        "text": "new text",
        "name": "new name",
        "brand_type": "custom_logo",
        "alt_text_en": "Alt text english",
        "alt_text_fr": "Alt text french",
    }

    mocker.patch("app.main.views.email_branding.persist_logo")
    mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

    platform_admin_client.post(
        url_for(".create_email_branding"),
        content_type="multipart/form-data",
        data=data,
    )

    assert mock_create_email_branding.called
    assert mock_create_email_branding.call_args == call(
        logo=data["logo"],
        name=data["name"],
        text=data["text"],
        colour=data["colour"],
        brand_type=data["brand_type"],
        organisation_id=None,
        alt_text_en=data["alt_text_en"],
        alt_text_fr=data["alt_text_fr"],
        created_by_id=sample_uuid(),
    )


def test_create_new_branding_with_org_works(platform_admin_client, mocker, mock_create_email_branding, mock_get_organisations):
    data = {
        "logo": None,
        "colour": "#ff0000",
        "text": "new text",
        "name": "new name",
        "brand_type": "custom_logo",
        "organisation": "7aa5d4e9-4385-4488-a489-07812ba13383",
        "alt_text_en": "Alt text en",
        "alt_text_fr": "Alt text fr",
    }

    mocker.patch("app.main.views.email_branding.persist_logo")
    mocker.patch("app.main.views.email_branding.delete_email_temp_files_created_by")

    platform_admin_client.post(
        url_for(".create_email_branding"),
        content_type="multipart/form-data",
        data=data,
    )

    assert mock_create_email_branding.called
    assert mock_create_email_branding.call_args == call(
        logo=data["logo"],
        name=data["name"],
        text=data["text"],
        colour=data["colour"],
        brand_type=data["brand_type"],
        organisation_id=data["organisation"],
        alt_text_en=data["alt_text_en"],
        alt_text_fr=data["alt_text_fr"],
        created_by_id=sample_uuid(),
    )


class TestBranding:
    def test_edit_branding_settings_displays_stock_options(self, mocker, service_one, platform_admin_client):
        service_one["permissions"] = ["manage_service"]

        response = platform_admin_client.get(
            url_for(".edit_branding_settings", service_id=service_one["id"]),
        )

        assert response.status_code == 200
        page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

        assert len(page.select("input[type=radio]")) == 2

    def test_edit_branding_settings_displays_forces_selection(self, mocker, service_one, platform_admin_client):
        service_one["permissions"] = ["manage_service"]

        response = platform_admin_client.post(
            url_for(".edit_branding_settings", service_id=service_one["id"]),
        )

        assert response.status_code == 200
        page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
        assert "You must select an option to continue" in page.text

    def test_edit_branding_moves_to_next_page(self, mocker, service_one, platform_admin_client):
        mocker.patch("app.models.service.Service.update", return_value=True)

        service_one["permissions"] = ["manage_service"]

        response = platform_admin_client.post(
            url_for(".edit_branding_settings", service_id=service_one["id"]),
            data={"goc_branding": "__FIP-EN__"},
        )

        assert response.status_code == 302
        assert response.location == url_for(".view_branding_settings", service_id=service_one["id"])

    def test_review_branding_pool_displays_choices(self, mocker, service_one, platform_admin_client):
        mocker.patch(
            "app.notify_client.email_branding_client.EmailBrandingClient.get_all_email_branding",
            return_value=[
                {
                    "id": "d51a41b2-c420-48a9-a8c5-e88444013020",
                    "colour": None,
                    "logo": "0b4ec2bd-e305-47c4-b910-6d9762ff6c1f-alb.png",
                    "name": "AssemblyLine",
                    "text": None,
                    "brand_type": "custom_logo",
                },
                {
                    "id": "d51a41b2-c420-48a9-a8c5-e88444013020",
                    "colour": None,
                    "logo": "0b4ec2bd-e305-47c4-b910-6d9762ff6c1f-alb.png",
                    "name": "AssemblyLine",
                    "text": None,
                    "brand_type": "custom_logo",
                },
            ],
        )
        service_one["permissions"] = ["manage_service"]

        response = platform_admin_client.get(
            url_for(".review_branding_pool", service_id=service_one["id"]),
        )

        assert response.status_code == 200
        page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")

        assert len(page.select("input[type=radio]")) == 2

    def test_review_branding_pool_forces_selection(self, mocker, service_one, platform_admin_client):
        mocker.patch(
            "app.notify_client.email_branding_client.EmailBrandingClient.get_all_email_branding",
            return_value=[
                {
                    "id": "d51a41b2-c420-48a9-a8c5-e88444013020",
                    "colour": None,
                    "logo": "0b4ec2bd-e305-47c4-b910-6d9762ff6c1f-alb.png",
                    "name": "AssemblyLine",
                    "text": None,
                    "brand_type": "custom_logo",
                },
                {
                    "id": "d51a41b2-c420-48a9-a8c5-e88444013020",
                    "colour": None,
                    "logo": "0b4ec2bd-e305-47c4-b910-6d9762ff6c1f-alb.png",
                    "name": "AssemblyLine",
                    "text": None,
                    "brand_type": "custom_logo",
                },
            ],
        )
        service_one["permissions"] = ["manage_service"]

        response = platform_admin_client.post(
            url_for(".review_branding_pool", service_id=service_one["id"]),
        )

        assert response.status_code == 200
        page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
        assert "You must select an option to continue" in page.text

    def test_get_preview_template_with_email_branding(self, mocker, app_):
        email_branding = {
            "brand_type": "custom_logo_with_background_colour",
            "colour": "#ff0000",
            "text": "Example Text",
            "logo": "example.png",
            "name": "Example Brand",
            "alt_text_en": "alt_text_en",
            "alt_text_fr": "alt_text_fr",
        }

        class MockService:
            email_branding_id = None

        mocker.patch("app.main.views.email_branding.email_branding_client.get_email_branding", return_value=email_branding)
        with app_.test_request_context():
            mocker.patch("app.main.views.email_branding.current_service", new=MockService)
            html_template = get_preview_template(email_branding)
            assert "There’s a custom logo at the top left and no logo at the bottom." in html_template
            assert "The canada wordmark is displayed at the bottom right" not in html_template

    def test_get_preview_template_with_default_branding_is_french(self, mocker, app_):
        class MockService:
            email_branding_id = None
            default_branding_is_french = True

        with app_.test_request_context():
            mocker.patch("app.main.views.email_branding.current_service", new=MockService)
            html_template = get_preview_template(None)
            assert "An example email showing the French-first government of Canada logo at the top left" in html_template
            assert "The canada wordmark is displayed at the bottom right" in html_template

    def test_get_preview_template_with_default_branding_is_english(self, mocker, app_):
        class MockService:
            email_branding_id = None
            default_branding_is_french = False

        with app_.test_request_context():
            mocker.patch("app.main.views.email_branding.current_service", new=MockService)
            html_template = get_preview_template(None)
            assert "An example email showing the English-first government of Canada logo at the top left" in html_template
            assert "The canada wordmark is displayed at the bottom right" in html_template

    def test_get_preview_template_with_email_branding_and_custom_brand_logo(self, mocker, app_):
        email_branding = {
            "brand_type": "both_english",
            "colour": "#ff0000",
            "text": "Example Text",
            "logo": "example.png",
            "name": "Example Brand",
            "alt_text_en": "alt_text_en",
            "alt_text_fr": "alt_text_fr",
        }

        class MockService:
            email_branding_id = 6
            default_branding_is_french = False

        with app_.test_request_context():
            mocker.patch(
                "app.main.views.email_branding.email_branding_client.get_email_branding",
                return_value={"email_branding": email_branding},
            )
            mocker.patch("app.main.views.email_branding.current_service", new=MockService)
            html_template = get_preview_template(None)
            assert "There’s a custom logo at the top left and no logo at the bottom." in html_template
            assert "The canada wordmark is displayed at the bottom right" not in html_template

    def test_create_branding_request(self, mocker, platform_admin_client):
        class MockOrg:
            name = "Test org"

        class MockService:
            email_branding_id = None
            default_branding_is_french = False
            id = "1234"
            name = "Awesome"
            organisation_id = "1234"
            organisation = MockOrg

        mocker.patch("app.main.views.email_branding.upload_email_logo", return_value="temp_filename")
        mocker.patch("app.main.views.email_branding.current_service", new=MockService)

        data = {
            "name": "test-logo",
            "file": (BytesIO("".encode("utf-8")), "test.png"),
            "alt_text_en": "ALT_EN",
            "alt_text_fr": "ALT_FR",
        }

        with patch.object(current_user, "send_branding_request", return_value="") as mock_create_branding_request:
            platform_admin_client.post(
                url_for(".create_branding_request", service_id="1234"),
                data=data,
            )

            assert mock_create_branding_request.called
            assert mock_create_branding_request.call_args == call(
                MockService.id,
                MockService.name,
                MockService.organisation_id,
                MockService.organisation.name,
                "temp_filename",
                data["alt_text_en"],
                data["alt_text_fr"],
                data["name"],
            )
