import uuid

import botocore
import boto3
from flask import current_app
from notifications_utils.s3 import s3upload as utils_s3upload

from app.s3_client.s3_logo_client import get_s3_object

FILE_LOCATION_STRUCTURE = 'service-{}-notify/{}.csv'


def get_csv_location(service_id, upload_id):
    return (
        current_app.config['CSV_UPLOAD_BUCKET_NAME'],
        FILE_LOCATION_STRUCTURE.format(service_id, upload_id),
    )


def get_csv_upload(service_id, upload_id):
    return get_s3_object(*get_csv_location(service_id, upload_id))


def s3upload(service_id, filedata, region):
    upload_id = str(uuid.uuid4())
    bucket_name, file_location = get_csv_location(service_id, upload_id)
    utils_s3upload(
        filedata=filedata['data'],
        region=region,
        bucket_name=bucket_name,
        file_location=file_location,
    )
    return upload_id


def s3download(service_id, upload_id):
    contents = ''
    try:
        key = get_csv_upload(service_id, upload_id)
        contents = key.get()['Body'].read().decode('utf-8')
    except botocore.exceptions.ClientError as e:
        current_app.logger.error("Unable to download s3 file {}".format(
            FILE_LOCATION_STRUCTURE.format(service_id, upload_id)))
        raise e
    return contents


def set_metadata_on_csv_upload(service_id, upload_id, **kwargs):
    get_csv_upload(
        service_id, upload_id
    ).copy_from(
        CopySource='{}/{}'.format(*get_csv_location(service_id, upload_id)),
        ServerSideEncryption='AES256',
        Metadata={
            key: str(value) for key, value in kwargs.items()
        },
        MetadataDirective='REPLACE',
    )

def list_bulk_send_uploads():
    session = boto3.Session(
        aws_access_key_id=current_app.config['BULK_SEND_AWS_ACCESS_KEY'],
        aws_secret_access_key=current_app.config['BULK_SEND_AWS_SECRET_KEY'],
        region_name=current_app.config['BULK_SEND_AWS_REGION'],
    )

    s3 = session.resource('s3')
    my_bucket = s3.Bucket(current_app.config['BULK_SEND_AWS_BUCKET'])

    files = []
    for my_bucket_object in my_bucket.objects.all():
        files.append(my_bucket_object)
    return files # [("abc", "abc"), ("xyz", "xyz")]