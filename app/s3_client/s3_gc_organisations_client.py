import json

import botocore
from unidecode import unidecode

from app.s3_client.s3_logo_client import get_s3_object


def get_gc_organisations(current_app):
    bucket = current_app.config["GC_ORGANISATIONS_BUCKET_NAME"]
    filename = current_app.config["GC_ORGANISATIONS_FILENAME"]
    try:
        key = get_s3_object(bucket, filename)
        data_str = key.get()["Body"].read().decode("utf-8")
        org_data = json.loads(data_str)

        org_name_data = {
            "en": [item["name_eng"] for item in org_data],
            "fr": [item["name_fra"] for item in org_data],
        }
        # unidecode is needed so that names starting with accents like é
        # are sorted correctly
        sorted_org_name_data = {
            "en": sorted(org_name_data["en"], key=unidecode),
            "fr": sorted(org_name_data["fr"], key=unidecode),
        }
        data = {"all": org_data, "names": sorted_org_name_data}
        return data

    except botocore.exceptions.ClientError as exception:
        current_app.logger.error("Unable to download s3 file {}/{}".format(bucket, filename))
        raise exception
