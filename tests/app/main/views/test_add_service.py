import pytest
from flask import url_for

from app.main.forms import FieldWithLanguageOptions
from app.utils import is_gov_user
from tests import organisation_json
from tests.conftest import mock_get_organisation_by_domain, normalize_spaces


def test_non_gov_user_cannot_see_add_service_button(
    client,
    mock_login,
    mock_get_non_govuser,
    api_nongov_user_active,
    mock_get_organisations,
    mock_get_organisations_and_services_for_user,
):
    client.login(api_nongov_user_active)
    response = client.get(url_for("main.choose_account"))
    assert "Add a new service" not in response.get_data(as_text=True)
    assert response.status_code == 200


@pytest.mark.parametrize(
    "org_json",
    (
        None,
        organisation_json(organisation_type=None),
    ),
)
def test_get_should_render_add_service_template(
    client_request,
    mocker,
    org_json,
):
    mocker.patch(
        "app.organisations_client.get_organisation_by_domain",
        return_value=org_json,
    )
    page = client_request.get("main.add_service")
    assert page.select_one("h1").text.strip() == "Name your service"
    assert page.select_one("input[name=name]")["value"] == ""
    assert [label.text.strip() for label in page.select(".multiple-choice label")] == []
    assert [radio["value"] for radio in page.select(".multiple-choice input")] == []


def test_get_should_not_render_radios_if_org_type_known(
    client_request,
    mocker,
):
    mocker.patch(
        "app.organisations_client.get_organisation_by_domain",
        return_value=organisation_json(organisation_type="central"),
    )
    page = client_request.get("main.add_service")
    assert page.select_one("h1").text.strip() == "Name your service"
    assert page.select_one("input[name=name]")["value"] == ""
    assert not page.select(".multiple-choice")


def test_visible_branding_choices_on_service_email_from_step(client_request):
    page = client_request.post(
        "main.add_service",
        _data={
            "name": "testing the post",
        },
        current_step="choose_email_from",
        _expected_status=200,
    )
    default_branding = page.select_one("input[name=email_from]")
    assert default_branding["type"] == "text"


def test_form_with_no_branding_should_warn_this_cant_be_empty(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={
            "default_branding": "",
        },
        current_step="choose_logo",
        _expected_status=200,
    )
    assert normalize_spaces(page.select_one(".error-message").text) == ("This cannot be empty")


def test_form_with_invalid_branding_should_request_another_valid_value(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={
            "name": "Show me the branding Jerry",
            "default_branding": "__portuguese__",
        },
        current_step="choose_logo",
        _expected_status=200,
    )
    assert normalize_spaces(page.select_one(".error-message").text) == ("You need to choose an option")


def test_wizard_no_flow_information_should_go_to_step1(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={},
        _expected_status=200,
    )
    assert page.select_one("h1").text.strip() == "Name your service"
    assert page.select_one("input[name=name]")["value"] == ""


def test_wizard_flow_with_step_1_should_display_service_name_form(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={
            "name": "",
            "next_step": "choose_service_name",
        },
        _expected_status=200,
    )
    assert page.select_one("h1").text.strip() == "Name your service"


def test_wizard_flow_with_step_1_should_call_service_name_is_unique(
    client_request,
    mock_service_name_is_unique,
):
    client_request.post(
        "main.add_service",
        _data={"name": "Service One"},
        current_step="choose_service_name",
        _expected_status=302,
    )
    assert mock_service_name_is_unique.called is True


def test_wizard_flow_with_step_2_should_display_email_from(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={},
        current_step="choose_email_from",
        _expected_status=200,
    )
    assert page.select_one("h1").text.strip() == "Create a sending email address for your service"


def test_wizard_flow_with_step_2_should_correct_invalid_email_from(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={"email_from": "[Health Canada! - Sante&&Canada]"},
        current_step="choose_email_from",
        _expected_status=200,
    )

    # ensure email has spaces and special characters removed
    assert page.find(id="email_from")["value"] == "health.canada-santecanada"


def test_wizard_flow_with_step_2_should_call_email_from_is_unique(
    client_request,
    mock_service_email_from_is_unique,
):
    client_request.post(
        "main.add_service",
        _data={"email_from": "email.from.here"},
        current_step="choose_email_from",
        _expected_status=302,
    )
    assert mock_service_email_from_is_unique.called is True


def test_wizard_flow_with_step_3_should_display_branding_form(client_request, mock_service_email_from_is_unique):
    page = client_request.get(
        "main.add_service",
        _data={},
        current_step="choose_logo",
        _expected_status=200,
    )
    assert page.select_one("h1").text.strip() == "Choose the default language of your service"


def test_wizard_flow_with_non_matching_steps_info_should_fallback_to_step1(
    client_request,
):
    page = client_request.post(
        "main.add_service",
        _data={
            "current_step": "",
        },
        _expected_status=200,
    )
    assert page.select_one("h1").text.strip() == "Name your service"


def test_wizard_flow_with_junk_step_info_should_fallback_to_step1(client_request, mock_service_name_is_unique):
    page = client_request.post(
        "main.add_service",
        _data={
            "name": "",
            "email_from": "junk_from",
            "default_branding": FieldWithLanguageOptions.FRENCH_OPTION_VALUE,
        },
        _follow_redirects=True,
        current_step="junk_step",
        _expected_status=200,
    )
    assert page.select_one("h1").text.strip() == "Name your service"
    assert mock_service_name_is_unique.called is False


@pytest.mark.parametrize(
    "email_address",
    (
        # User’s email address doesn’t matter when the organisation is known
        "test@tbs-sct.gc.ca",
        "test@canada.ca",
    ),
)
@pytest.mark.parametrize(
    "inherited, posted, persisted, sms_limit",
    (
        (None, "central", "central", 250000),
        (None, "nhs_central", "nhs_central", 250000),
        (None, "nhs_gp", "nhs_gp", 25000),
        (None, "nhs_local", "nhs_local", 25000),
        (None, "local", "local", 25000),
        (None, "emergency_service", "emergency_service", 25000),
        (None, "school_or_college", "school_or_college", 25000),
        (None, "other", "other", 25000),
        ("central", None, "central", 250000),
        ("nhs_central", None, "nhs_central", 250000),
        ("nhs_local", None, "nhs_local", 25000),
        ("local", None, "local", 25000),
        ("emergency_service", None, "emergency_service", 25000),
        ("school_or_college", None, "school_or_college", 25000),
        ("other", None, "other", 25000),
        ("central", "local", "central", 250000),
    ),
)
@pytest.mark.skip(reason="feature not in use - defaults to central")
def test_should_add_service_and_redirect_to_tour_when_no_services(
    mocker,
    client_request,
    mock_create_service,
    mock_create_service_template,
    mock_get_services_with_no_services,
    api_user_active,
    mock_create_or_update_free_sms_fragment_limit,
    mock_get_all_email_branding,
    inherited,
    email_address,
    posted,
    persisted,
    sms_limit,
):
    api_user_active["email_address"] = email_address
    client_request.login(api_user_active)
    mock_get_organisation_by_domain(mocker, organisation_type=inherited)
    client_request.post(
        "main.add_service",
        _data={
            "name": "testing the post",
            "organisation_type": posted,
        },
        _expected_status=302,
        _expected_redirect=url_for(
            "main.start_tour",
            service_id=101,
            template_id="Example%20text%20message%20template",
            _external=True,
        ),
    )
    assert mock_get_services_with_no_services.called
    mock_create_service.assert_called_once_with(
        service_name="testing the post",
        organisation_type=persisted,
        message_limit=50,
        restricted=True,
        user_id=api_user_active["id"],
        email_from="testing.the.post",
    )
    mock_create_service_template.assert_called_once_with(
        "Example text message template",
        "sms",
        ("Hey ((name)), I’m trying out GC Notify. Today is " "((day of week)) and my favourite colour is ((colour))."),
        101,
    )

    with client_request.session_transaction() as session:
        assert session["service_id"] == 101
    mock_create_or_update_free_sms_fragment_limit.assert_called_once_with(101, sms_limit)


@pytest.mark.skip(reason="feature not in use - defaults to central")
def test_add_service_has_to_choose_org_type(
    mocker,
    client_request,
    mock_create_service,
    mock_create_service_template,
    mock_get_services_with_no_services,
    api_user_active,
    mock_create_or_update_free_sms_fragment_limit,
    mock_get_all_email_branding,
):
    mocker.patch(
        "app.organisations_client.get_organisation_by_domain",
        return_value=None,
    )
    page = client_request.post(
        "main.add_service",
        _data={
            "name": "testing the post",
        },
        _expected_status=200,
    )
    assert normalize_spaces(page.select_one(".error-message").text) == ("You need to choose an option")
    assert mock_create_service.called is False
    assert mock_create_service_template.called is False
    assert mock_create_or_update_free_sms_fragment_limit.called is False


@pytest.mark.parametrize(
    "email_address",
    (
        "test@canada.ca",
        "test@tbs-sct.gc.ca",
        "test@canada.ca",
        pytest.param("test@not-canada.ca", marks=pytest.mark.xfail(raises=AssertionError)),
    ),
)
def test_get_should_only_show_nhs_org_types_radios_if_user_has_nhs_email(
    client_request,
    mocker,
    api_user_active,
    email_address,
):
    api_user_active["email_address"] = email_address
    client_request.login(api_user_active)
    mocker.patch(
        "app.organisations_client.get_organisation_by_domain",
        return_value=None,
    )
    page = client_request.get("main.add_service")
    assert page.select_one("h1").text.strip() == "Name your service"
    assert page.select_one("input[name=name]")["value"] == ""
    assert [label.text.strip() for label in page.select(".multiple-choice label")] == []
    assert [radio["value"] for radio in page.select(".multiple-choice input")] == []


@pytest.mark.parametrize("organisation_type, free_allowance", [("central", 25 * 1000)])
def test_should_add_service_and_redirect_to_dashboard_along_with_proper_side_effects(
    app_,
    client_request,
    mock_create_service,
    mock_create_service_template,
    mock_get_organisation_by_domain,
    api_user_active,
    organisation_type,
    free_allowance,
    mock_create_or_update_free_sms_fragment_limit,
    mock_get_all_email_branding,
    mock_service_name_is_unique,
    mock_service_email_from_is_unique,
):

    client_request.post(
        "main.add_service",
        _data={
            "name": "testing the post",
        },
        _expected_status=200,
        _follow_redirects=True,
    )
    assert mock_service_name_is_unique.called is True

    client_request.post(
        "main.add_service",
        _data={
            "email_from": "testing.the.post",
        },
        current_step="choose_email_from",
        _expected_status=200,
        _follow_redirects=True,
    )
    assert mock_service_email_from_is_unique.called is True

    client_request.post(
        "main.add_service",
        _data={
            "default_branding": FieldWithLanguageOptions.FRENCH_OPTION_VALUE,
        },
        current_step="choose_logo",
        _expected_status=302,
        _expected_redirect=url_for(
            "main.service_dashboard",
            service_id=101,
            _external=True,
        ),
    )
    mock_create_service.assert_called_once_with(
        service_name="testing the post",
        message_limit=app_.config["DEFAULT_SERVICE_LIMIT"],
        restricted=True,
        user_id=api_user_active["id"],
        email_from="testing.the.post",
        default_branding_is_french=True,
        organisation_type=organisation_type,
    )
    mock_create_or_update_free_sms_fragment_limit.assert_called_once_with(101, free_allowance)
    assert len(mock_create_service_template.call_args_list) == 0
    with client_request.session_transaction() as session:
        assert session["service_id"] == 101


def test_should_return_form_errors_when_service_name_is_empty(
    client_request,
    mock_get_organisation_by_domain,
):
    page = client_request.post(
        "main.add_service",
        _data={
            "current_step": "choose_service_name",
        },
        _expected_status=200,
    )
    assert "This cannot be empty" in page.text


def test_should_return_form_errors_when_service_email_from_is_empty(
    client_request,
    mock_get_organisation_by_domain,
):
    page = client_request.post(
        "main.add_service",
        _data={"email_from": ""},
        current_step="choose_email_from",
        _expected_status=200,
    )
    assert "This cannot be empty" in page.text


def test_should_return_form_errors_with_duplicate_service_name_regardless_of_case(
    client_request,
    mock_create_duplicate_service,
    mock_get_organisation_by_domain,
    mock_service_name_is_not_unique,
):
    page = client_request.post(
        "main.add_service",
        _data={
            "current_step": "choose_logo",
            "email_from": "servicE1",
            "name": "SERVICE ONE",
            "default_branding": FieldWithLanguageOptions.FRENCH_OPTION_VALUE,
            "organisation_type": "central",
        },
        _expected_status=200,
    )
    assert page.select_one(".error-message").text.strip() == ("This service name is already in use")
    assert mock_service_name_is_not_unique.called is True


def test_non_safelist_user_cannot_access_create_service_page(
    client_request,
    mock_get_non_govuser,
    api_nongov_user_active,
    mock_get_organisations,
):
    assert is_gov_user(api_nongov_user_active["email_address"]) is False
    client_request.get(
        "main.add_service",
        _expected_status=403,
    )


def test_non_safelist_user_cannot_create_service(
    client_request,
    mock_get_non_govuser,
    api_nongov_user_active,
    mock_get_organisations,
):
    assert is_gov_user(api_nongov_user_active["email_address"]) is False
    client_request.post(
        "main.add_service",
        _data={"name": "SERVICE TWO"},
        _expected_status=403,
    )
