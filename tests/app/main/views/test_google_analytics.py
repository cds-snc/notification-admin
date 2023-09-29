def test_google_analytics_logged_in(
    client_request,
    active_cds_user_with_permissions,
    active_user_with_permissions,
):
    # Ensure GA scripts ARE NOT loaded for cds users
    client_request.login(active_cds_user_with_permissions)
    page = client_request.get("main.welcome")
    assert "googletagmanager" not in str(page.contents)

    # Ensure GA scripts ARE loaded for non-cds users
    client_request.login(active_user_with_permissions)
    page = client_request.get("main.welcome")
    assert "googletagmanager" in str(page.contents)


def test_google_analytics_logged_out(
    client_request,
    active_cds_user_with_permissions,
    active_user_with_permissions,
):
    # Ensure GA scripts are loaded for logged out users
    client_request.login(active_cds_user_with_permissions)
    client_request.logout()
    page = client_request.get("main.sign_in")
    assert "googletagmanager" in str(page.contents)

    client_request.login(active_user_with_permissions)
    client_request.logout()
    page = client_request.get("main.sign_in")
    assert "googletagmanager" in str(page.contents)
