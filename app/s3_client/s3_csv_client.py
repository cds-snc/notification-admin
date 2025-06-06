import uuid

import botocore
from boto3 import resource
from flask import current_app
from notifications_utils.s3 import s3upload as utils_s3upload

from app.s3_client.s3_logo_client import get_s3_object

FILE_LOCATION_STRUCTURE = "service-{}-notify/{}.csv"
REPORTS_FILE_LOCATION_STRUCTURE = "reports/{}/{}.csv"

# Default chunk size for streaming (1MB)
CHUNK_SIZE = 1024 * 1024


def get_csv_location(service_id, upload_id):
    return (
        current_app.config["CSV_UPLOAD_BUCKET_NAME"],
        FILE_LOCATION_STRUCTURE.format(service_id, upload_id),
    )


def get_report_location(service_id, report_id):
    return REPORTS_FILE_LOCATION_STRUCTURE.format(service_id, report_id)


def get_csv_upload(service_id, upload_id):
    return get_s3_object(*get_csv_location(service_id, upload_id))


def s3upload(service_id, filedata, region):
    upload_id = str(uuid.uuid4())
    bucket_name, file_location = get_csv_location(service_id, upload_id)
    utils_s3upload(
        filedata=filedata["data"],
        region=region,
        bucket_name=bucket_name,
        file_location=file_location,
    )
    return upload_id


def s3download(service_id, upload_id):
    contents = ""
    try:
        key = get_csv_upload(service_id, upload_id)
        contents = key.get()["Body"].read().decode("utf-8")
    except botocore.exceptions.ClientError as e:
        current_app.logger.error("Unable to download s3 file {}".format(FILE_LOCATION_STRUCTURE.format(service_id, upload_id)))
        raise e
    return contents


def set_metadata_on_csv_upload(service_id, upload_id, **kwargs):
    get_csv_upload(service_id, upload_id).copy_from(
        CopySource="{}/{}".format(*get_csv_location(service_id, upload_id)),
        ServerSideEncryption="AES256",
        Metadata={key: str(value) for key, value in kwargs.items()},
        MetadataDirective="REPLACE",
    )


def list_bulk_send_uploads():
    s3 = resource("s3")
    bulk_send_bucket = s3.Bucket(current_app.config["BULK_SEND_AWS_BUCKET"])

    files = []
    for f in bulk_send_bucket.objects.all():
        files.append(f)
    # sort so most recent files are at the top of the page
    files.sort(key=lambda f: f.last_modified, reverse=True)
    return files


def copy_bulk_send_file_to_uploads(service_id, filekey):
    s3 = resource("s3")
    obj = s3.Object(current_app.config["BULK_SEND_AWS_BUCKET"], filekey)
    body = obj.get()["Body"].read()
    upload_id = s3upload(service_id, {"data": body}, current_app.config["AWS_REGION"])
    return upload_id


def s3download_report_chunks(service_id, report_id, chunk_size=CHUNK_SIZE):
    """
    Generator function to stream S3 file data in chunks.

    Args:
        file_path: The path to the file in the bucket
        chunk_size: Size of chunks to read (defaults to 1MB)

    Yields:
        Chunks of binary data from the S3 file
    """
    try:
        key = get_s3_object(current_app.config["REPORTS_BUCKET_NAME"], get_report_location(service_id, report_id))
        # Get the S3 object body
        body = key.get()["Body"]
        # Read and yield chunks
        chunk = body.read(chunk_size)
        while chunk:
            yield chunk
            chunk = body.read(chunk_size)
    except botocore.exceptions.ClientError as e:
        current_app.logger.error(
            f"Unable to stream S3 file {current_app.config["REPORTS_BUCKET_NAME"]}/{get_report_location(service_id, report_id)}"
        )
        raise e
