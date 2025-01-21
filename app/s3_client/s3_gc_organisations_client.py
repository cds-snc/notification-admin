import botocore
from flask import current_app

from app.s3_client.s3_logo_client import get_s3_object


def get_gc_organisations():
    bucket = current_app.config["GC_ORGANISATIONS_BUCKET_NAME"]
    filename = current_app.config["GC_ORGANISATIONS_FILENAME"]
    try:
        key = get_s3_object(bucket, filename)
        return key.get()["Body"].read().decode("utf-8")
    except botocore.exceptions.ClientError as exception:
        current_app.logger.error("Unable to download s3 file {}/{}".format(bucket, filename))
        raise exception
