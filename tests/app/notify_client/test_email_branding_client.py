from unittest.mock import call

from app.notify_client.email_branding_client import EmailBrandingClient


def test_get_email_branding(mocker, fake_uuid):
    mock_get = mocker.patch(
        "app.notify_client.email_branding_client.EmailBrandingClient.get",
        return_value={"foo": "bar"},
    )
    mock_redis_get = mocker.patch(
        "app.extensions.RedisClient.get",
        return_value=None,
    )
    mock_redis_set = mocker.patch(
        "app.extensions.RedisClient.set",
    )
    EmailBrandingClient().get_email_branding(fake_uuid)
    mock_get.assert_called_once_with(url="/email-branding/{}".format(fake_uuid))
    mock_redis_get.assert_called_once_with("email_branding-{}".format(fake_uuid))
    mock_redis_set.assert_called_once_with(
        "email_branding-{}".format(fake_uuid),
        '{"foo": "bar"}',
        ex=604800,
    )


def test_get_all_email_branding(mocker):
    mock_get = mocker.patch(
        "app.notify_client.email_branding_client.EmailBrandingClient.get",
        return_value={"email_branding": [1, 2, 3]},
    )
    mock_redis_get = mocker.patch(
        "app.extensions.RedisClient.get",
        return_value=None,
    )
    mock_redis_set = mocker.patch(
        "app.extensions.RedisClient.set",
    )
    EmailBrandingClient().get_all_email_branding()
    mock_get.assert_called_once_with(url="/email-branding", params={"organisation_id": None})
    mock_redis_get.assert_called_once_with("email_branding-None")
    mock_redis_set.assert_called_once_with(
        "email_branding-None",
        "[1, 2, 3]",
        ex=604800,
    )


def test_get_all_email_branding_filter_organisation(mocker):
    mock_get = mocker.patch(
        "app.notify_client.email_branding_client.EmailBrandingClient.get",
        return_value={"email_branding": [1, 2, 3]},
    )
    mock_redis_get = mocker.patch(
        "app.extensions.RedisClient.get",
        return_value=None,
    )
    mock_redis_set = mocker.patch(
        "app.extensions.RedisClient.set",
    )
    EmailBrandingClient().get_all_email_branding(organisation_id="org_1")
    mock_get.assert_called_once_with(url="/email-branding", params={"organisation_id": "org_1"})
    mock_redis_get.assert_called_once_with("email_branding-org_1")
    mock_redis_set.assert_called_once_with(
        "email_branding-org_1",
        "[1, 2, 3]",
        ex=604800,
    )


def test_create_email_branding(mocker, fake_uuid):
    org_data = {
        "logo": "test.png",
        "name": "test name",
        "text": "test name",
        "colour": "red",
        "brand_type": "custom_logo",
        "organisation_id": "org-id-123",
        "alt_text_en": "test",
        "alt_text_fr": "test2",
        "created_by_id": fake_uuid,
    }

    mock_post = mocker.patch("app.notify_client.email_branding_client.EmailBrandingClient.post")
    mock_redis_delete = mocker.patch("app.extensions.RedisClient.delete")
    EmailBrandingClient().create_email_branding(
        logo=org_data["logo"],
        name=org_data["name"],
        text=org_data["text"],
        colour=org_data["colour"],
        brand_type="custom_logo",
        organisation_id=org_data["organisation_id"],
        alt_text_en=org_data["alt_text_en"],
        alt_text_fr=org_data["alt_text_fr"],
        created_by_id=fake_uuid,
    )

    mock_post.assert_called_once_with(url="/email-branding", data=org_data)
    mock_redis_delete.call_args_list == [
        call("email_branding-None"),
        call("email_branding-org-id-123"),
    ]


def t_update_email_branding(mocker, fake_uuid):
    org_data = {
        "logo": "test.png",
        "name": "test name",
        "text": "test name",
        "colour": "red",
        "brand_type": "custom_logo",
        "organisation_id": "org-id-123",
        "alt_text_en": "test",
        "alt_text_fr": "test2",
    }

    mock_post = mocker.patch("app.notify_client.email_branding_client.EmailBrandingClient.post")
    mock_redis_delete = mocker.patch("app.extensions.RedisClient.delete")
    EmailBrandingClient().update_email_branding(
        branding_id=fake_uuid,
        logo=org_data["logo"],
        name=org_data["name"],
        text=org_data["text"],
        colour=org_data["colour"],
        brand_type="custom_logo",
        organisation_id=org_data["organisation_id"],
        alt_text_en=org_data["alt_text_en"],
        alt_text_fr=org_data["alt_text_fr"],
        updated_by_id=fake_uuid,
    )

    mock_post.assert_called_once_with(url="/email-branding/{}".format(fake_uuid), data=org_data)
    assert mock_redis_delete.call_args_list == [
        call("email_branding-None"),
        call("email_branding-{}".format(org_data["organisation_id"])),
        call("email_branding-{}".format(fake_uuid)),
    ]
