def test_find_ids_page_loads_correctly(client_request, platform_admin_user):
    client_request.login(platform_admin_user)
    document = client_request.get("main.find_ids")

    assert document.h1.text.strip() == "Search for ids"
    assert len(document.find_all("input", {"type": "search"})) > 0


def test_find_ids_displays_services_found(client_request, platform_admin_user, mocker):
    client_request.login(platform_admin_user)
    get_records = mocker.patch(
        "app.support_api_client.find_ids",
        return_value=[{"id": "1234", "type": "service", "service_name": "Test Service"}],
    )
    document = client_request.post(
        "main.find_ids",
        _data={"search": "1234"},
        _expected_status=200,
    )
    get_records.assert_called_once_with("1234")
    result = document.find("a", {"class": "browse-list-link"})
    assert result.text.strip() == "Test Service"
    assert result.attrs["href"] == "/services/1234"


def test_find_ids_displays_notifications_found(client_request, platform_admin_user, mocker):
    client_request.login(platform_admin_user)
    get_records = mocker.patch(
        "app.support_api_client.find_ids",
        return_value=[
            {
                "id": "1234",
                "type": "notification",
                "service_id": "service_1234",
                "service_name": "Test Service",
                "template_id": "template_1234",
                "template_name": "Test Template",
            }
        ],
    )
    document = client_request.post(
        "main.find_ids",
        _data={"search": "1234"},
        _expected_status=200,
    )
    get_records.assert_called_once_with("1234")
    results = document.findAll("a", {"class": "browse-list-link"})
    assert len(results) == 3
    assert results[0].text.strip() == "Test Service"
    assert results[0].attrs["href"] == "/services/service_1234"
    assert results[1].text.strip() == "Test Template"
    assert results[1].attrs["href"] == "/services/service_1234/templates/template_1234"
    assert results[2].text.strip() == "notification"
    assert results[2].attrs["href"] == "/services/service_1234/notification/1234"


def test_find_ids_displays_templates_found(client_request, platform_admin_user, mocker):
    client_request.login(platform_admin_user)
    get_records = mocker.patch(
        "app.support_api_client.find_ids",
        return_value=[
            {
                "id": "1234",
                "type": "template",
                "template_name": "Test Template",
                "service_id": "service_1234",
                "service_name": "Test Service",
            }
        ],
    )
    document = client_request.post(
        "main.find_ids",
        _data={"search": "1234"},
        _expected_status=200,
    )
    get_records.assert_called_once_with("1234")
    results = document.findAll("a", {"class": "browse-list-link"})
    assert len(results) == 2
    assert results[0].text.strip() == "Test Service"
    assert results[0].attrs["href"] == "/services/service_1234"
    assert results[1].text.strip() == "Test Template"
    assert results[1].attrs["href"] == "/services/service_1234/templates/1234"


def test_find_ids_displays_users_found(client_request, platform_admin_user, mocker):
    client_request.login(platform_admin_user)
    get_records = mocker.patch(
        "app.support_api_client.find_ids",
        return_value=[{"id": "1234", "type": "user", "user_name": "Test User"}],
    )
    document = client_request.post(
        "main.find_ids",
        _data={"search": "1234"},
        _expected_status=200,
    )
    get_records.assert_called_once_with("1234")
    result = document.find("a", {"class": "browse-list-link"})

    assert result.text.strip() == "Test User"
    assert result.attrs["href"] == "/users/1234"


def test_find_ids_displays_jobs_found(client_request, platform_admin_user, mocker):
    client_request.login(platform_admin_user)
    get_records = mocker.patch(
        "app.support_api_client.find_ids",
        return_value=[
            {
                "id": "1234",
                "type": "job",
                "service_id": "service_1234",
                "service_name": "Test Service",
                "template_id": "template_1234",
                "template_name": "Test Template",
            }
        ],
    )
    document = client_request.post(
        "main.find_ids",
        _data={"search": "1234"},
        _expected_status=200,
    )
    get_records.assert_called_once_with("1234")
    results = document.findAll("a", {"class": "browse-list-link"})
    assert len(results) == 3
    assert results[0].text.strip() == "Test Service"
    assert results[0].attrs["href"] == "/services/service_1234"
    assert results[1].text.strip() == "Test Template"
    assert results[1].attrs["href"] == "/services/service_1234/templates/template_1234"
    assert results[2].text.strip() == "job"
    assert results[2].attrs["href"] == "/services/service_1234/jobs/1234"


def test_find_ids_display_two_records(client_request, platform_admin_user, mocker):
    client_request.login(platform_admin_user)
    get_records = mocker.patch(
        "app.support_api_client.find_ids",
        return_value=[
            {"id": "1234", "type": "service", "service_name": "Test Service"},
            {"id": "5678", "type": "user", "user_name": "Test User"},
        ],
    )
    document = client_request.post("main.find_ids", _data={"search": "1234,5678"}, _expected_status=200)
    get_records.assert_called_once_with("1234,5678")
    results = document.findAll("a", {"class": "browse-list-link"})
    assert len(results) == 2
    assert [result.text.strip() for result in results] == [
        "Test Service",
        "Test User",
    ]
    assert [result.attrs["href"] for result in results] == [
        "/services/1234",
        "/users/5678",
    ]
