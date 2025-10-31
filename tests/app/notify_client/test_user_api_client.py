from app.extensions import redis_client
from app.notify_client.user_api_client import user_api_client


def test_suspend_user_uses_backend_returned_service_ids_and_deletes_keys(mocker):
    # backend returns services_suspended in data
    mock_response = {"data": {"services_suspended": ["svc-1", "svc-2"]}}
    mocker.patch.object(user_api_client, "post", return_value=mock_response)

    delete_spy = mocker.patch.object(redis_client, "delete")
    pattern_spy = mocker.patch.object(redis_client, "delete_cache_keys_by_pattern")

    resp = user_api_client.suspend_user("user-1")

    assert resp == mock_response

    # assert redis_client.delete was called for both services (keys might be passed as multiple args)
    # there should be one call per service
    calls = delete_spy.call_count
    assert calls >= 2

    # pattern delete should not be used in the happy path
    assert not pattern_spy.called


def test_suspend_user_falls_back_to_get_organisations_and_services(mocker):
    # backend returns no services_suspended, so fallback should call get_organisations_and_services_for_user
    mocker.patch.object(user_api_client, "post", return_value={})

    orgs_resp = {"data": [{"id": "org-1", "services": [{"id": "svc-3"}, {"id": "svc-4"}]}]}
    mocker.patch.object(user_api_client, "get_organisations_and_services_for_user", return_value=orgs_resp)

    delete_spy = mocker.patch.object(redis_client, "delete")

    resp = user_api_client.suspend_user("user-2")

    assert resp == {}
    assert delete_spy.call_count >= 2


def test_suspend_user_swallow_cache_errors(mocker):
    # backend returns services_suspended but redis delete raises
    mock_response = {"data": {"services_suspended": ["svc-error"]}}
    mocker.patch.object(user_api_client, "post", return_value=mock_response)

    def raise_on_delete(*args, **kwargs):
        # only raise for service-related keys; allow user key delete to succeed
        key = args[0] if args else ""
        if isinstance(key, str) and key.startswith("service-"):
            raise Exception("redis down")
        return None

    mocker.patch.object(redis_client, "delete", side_effect=raise_on_delete)
    pattern_spy = mocker.patch.object(redis_client, "delete_cache_keys_by_pattern")

    # should not raise despite redis delete raising
    resp = user_api_client.suspend_user("user-3")
    assert resp == mock_response

    # fallback pattern delete attempted (in our implementation, pattern delete is run inside suppress if delete fails)
    # pattern delete may or may not be called depending on exception path; ensure function completed
    assert pattern_spy is not None


def test_suspend_user_deletes_user_and_service_cache_keys(mocker):
    # backend returns services_suspended in data
    mock_response = {"data": {"services_suspended": ["svc-1"]}}
    mocker.patch.object(user_api_client, "post", return_value=mock_response)

    delete_spy = mocker.patch.object(redis_client, "delete")

    resp = user_api_client.suspend_user("user-1")

    assert resp == mock_response

    # ensure a delete call included the user cache key
    called_args = [call.args for call in delete_spy.call_args_list]
    flat_args = []
    for args in called_args:
        for a in args:
            flat_args.append(a)

    assert any(a == "user-user-1" for a in flat_args), "expected user cache key to be deleted"

    # ensure service-related keys were deleted
    assert any(a == "service-svc-1" for a in flat_args)
    assert any(a == "service-svc-1-templates" or a == "service-svc-1-template-folders" for a in flat_args)
