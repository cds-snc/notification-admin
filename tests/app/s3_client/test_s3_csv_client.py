from unittest.mock import Mock

from flask import current_app

from app.s3_client.s3_csv_client import set_metadata_on_csv_upload


def test_sets_metadata(client, mocker):
    mocked_s3_object = Mock()
    mocked_get_s3_object = mocker.patch(
        'app.s3_client.s3_csv_client.get_csv_upload',
        return_value=mocked_s3_object,
    )

    set_metadata_on_csv_upload('1234', '5678', foo='bar', baz=True)

    mocked_get_s3_object.assert_called_once_with('1234', '5678')
    mocked_s3_object.copy_from.assert_called_once_with(
        CopySource=current_app.config['CSV_UPLOAD_BUCKET_NAME'] + '/service-1234-notify/5678.csv',
        Metadata={'baz': 'True', 'foo': 'bar'},
        MetadataDirective='REPLACE',
        ServerSideEncryption='AES256',
    )
