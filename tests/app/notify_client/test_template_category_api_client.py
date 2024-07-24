from unittest.mock import call

import pytest
from requests import HTTPError

from app.notify_client.template_category_api_client import TemplateCategoryClient


@pytest.fixture
def template_category_client(mocker):
    return TemplateCategoryClient()


def test_create_template_category(template_category_client, mocker):
    mock_post = mocker.patch("app.notify_client.template_category_api_client.TemplateCategoryClient.post")
    template_category_client.create_template_category(
        name_en="Test Name EN",
        name_fr="Test Name FR",
        description_en="Test Description EN",
        description_fr="Test Description FR",
        sms_process_type="sms_process",
        email_process_type="email_process",
        hidden="True",
        sms_sending_vehicle="long_code",
    )
    data = {
        "name_en": "Test Name EN",
        "name_fr": "Test Name FR",
        "description_en": "Test Description EN",
        "description_fr": "Test Description FR",
        "sms_process_type": "sms_process",
        "email_process_type": "email_process",
        "hidden": True,
        "sms_sending_vehicle": "long_code",
    }
    mock_post.assert_called_once_with(url="/template-category", data=data)


def test_get_template_category(template_category_client, mocker, fake_uuid):
    mock_get = mocker.patch(
        "app.notify_client.template_category_api_client.TemplateCategoryClient.get",
        return_value={"template_category": "bar"},
    )
    mock_redis_get = mocker.patch(
        "app.extensions.RedisClient.get",
        return_value=None,
    )
    mock_redis_set = mocker.patch(
        "app.extensions.RedisClient.set",
    )
    template_category_client.get_template_category(template_category_id=fake_uuid)
    mock_get.assert_called_once_with(url=f"/template-category/{fake_uuid}")
    mock_redis_get.assert_called_once_with(f"template_category-{fake_uuid}")
    mock_redis_set.assert_called_once_with(
        f"template_category-{fake_uuid}",
        '"bar"',
        ex=604800,
    )


def test_get_all_template_categories(app_, template_category_client, mocker, fake_uuid):
    mock_get = mocker.patch(
        "app.notify_client.template_category_api_client.TemplateCategoryClient.get",
        return_value={"template_categories": [1, 2, 3]},
    )
    mock_redis_get = mocker.patch(
        "app.extensions.RedisClient.get",
        return_value=None,
    )
    mock_redis_set = mocker.patch(
        "app.extensions.RedisClient.set",
    )
    template_category_client.get_all_template_categories(template_type="template_type")
    mock_get.assert_called_once_with(url="/template-category")
    mock_redis_get.assert_called_once_with("template_categories")
    mock_redis_set.assert_called_once_with(
        "template_categories",
        "[1, 2, 3]",
        ex=604800,
    )


def test_update_template_category(template_category_client, mocker):
    mock_post = mocker.patch("app.notify_client.template_category_api_client.TemplateCategoryClient.post", return_value=None)
    mock_redis_delete = mocker.patch(
        "app.extensions.RedisClient.delete",
    )

    template_category_client.update_template_category(
        template_category_id="template_category_id",
        name_en="Test Name EN",
        name_fr="Test Name FR",
        description_en="Test Description EN",
        description_fr="Test Description FR",
        sms_process_type="sms_process",
        email_process_type="email_process",
        hidden="hidden",
        sms_sending_vehicle="long_code",
    )
    data = {
        "name_en": "Test Name EN",
        "name_fr": "Test Name FR",
        "description_en": "Test Description EN",
        "description_fr": "Test Description FR",
        "sms_process_type": "sms_process",
        "email_process_type": "email_process",
        "hidden": "hidden",
        "sms_sending_vehicle": "long_code",
    }
    mock_post.assert_called_once_with(url="/template-category/template_category_id", data=data)
    assert call("template_categories") in mock_redis_delete.call_args_list
    assert call("template_category-template_category_id") in mock_redis_delete.call_args_list
    assert len(mock_redis_delete.call_args_list) == 2


def test_delete_template_category(template_category_client, mocker):
    mock_delete = mocker.patch("app.notify_client.template_category_api_client.TemplateCategoryClient.delete")
    mock_redis_delete = mocker.patch("app.extensions.RedisClient.delete", return_value=None)

    template_category_client.delete_template_category(template_category_id="template_category_id", cascade=False)

    mock_delete.assert_called_once_with(url="/template-category/template_category_id", data=False)
    assert [call("template_categories"), call("template_category-template_category_id")] in mock_redis_delete.call_args_list


def test_delete_template_category_returns_raises_exception_if_status_code_is_400(template_category_client, mocker):
    mock_delete = mocker.patch("app.notify_client.template_category_api_client.TemplateCategoryClient.delete")
    mock_delete.side_effect = HTTPError(response=type("Response", (object,), {"status_code": 400}))

    with pytest.raises(HTTPError):
        template_category_client.delete_template_category(template_category_id="template_category_id", cascade=False)

    mock_delete.assert_called_once_with(url="/template-category/template_category_id", data=False)
