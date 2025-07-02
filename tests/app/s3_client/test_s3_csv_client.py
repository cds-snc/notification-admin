from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError
from flask import current_app

from app.s3_client.s3_csv_client import get_report_metadata, set_metadata_on_csv_upload


def test_sets_metadata(client, mocker):
    mocked_s3_object = Mock()
    mocked_get_s3_object = mocker.patch(
        "app.s3_client.s3_csv_client.get_csv_upload",
        return_value=mocked_s3_object,
    )

    set_metadata_on_csv_upload("1234", "5678", foo="bar", baz=True)

    mocked_get_s3_object.assert_called_once_with("1234", "5678")
    mocked_s3_object.copy_from.assert_called_once_with(
        CopySource=current_app.config["CSV_UPLOAD_BUCKET_NAME"] + "/service-1234-notify/5678.csv",
        Metadata={"baz": "True", "foo": "bar"},
        MetadataDirective="REPLACE",
        ServerSideEncryption="AES256",
    )


def test_get_report_metadata_returns_metadata(mocker, client, mock_current_app):
    mock_key = Mock()
    mock_key.metadata = {"foo": "bar"}
    mock_get_s3_object = mocker.patch(
        "app.s3_client.s3_csv_client.get_s3_object",
        return_value=mock_key,
    )
    result = get_report_metadata("service_id", "report_id")
    mock_get_s3_object.assert_called_once_with("test-bucket", mocker.ANY)
    assert result == {"foo": "bar"}


def test_get_report_metadata_returns_empty_dict_when_no_metadata(mocker, client, mock_current_app):
    mock_key = Mock()
    mock_key.metadata = None
    mocker.patch(
        "app.s3_client.s3_csv_client.get_s3_object",
        return_value=mock_key,
    )
    result = get_report_metadata("service_id", "report_id")
    assert result == {}


def test_get_report_metadata_returns_none_on_404(mocker, client, mock_current_app):
    error = ClientError(error_response={"Error": {"Code": "404"}}, operation_name="GetObject")
    mocker.patch(
        "app.s3_client.s3_csv_client.get_s3_object",
        side_effect=error,
    )
    mock_logger = mock_current_app.logger
    result = get_report_metadata("service_id", "report_id")
    assert result is None
    assert mock_logger.info.called


def test_get_report_metadata_raises_other_client_error(mocker, client, mock_current_app):
    error = ClientError(error_response={"Error": {"Code": "500"}}, operation_name="GetObject")
    mocker.patch(
        "app.s3_client.s3_csv_client.get_s3_object",
        side_effect=error,
    )
    mock_logger = mock_current_app.logger
    with pytest.raises(ClientError):
        get_report_metadata("service_id", "report_id")
    assert mock_logger.error.called


@pytest.fixture
def mock_current_app(mocker):
    mock_app = mocker.patch("app.s3_client.s3_csv_client.current_app")
    mock_app.config = {"REPORTS_BUCKET_NAME": "test-bucket"}
    return mock_app
