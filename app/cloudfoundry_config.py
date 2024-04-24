"""
Extracts cloudfoundry config from its json and populates the environment variables that we would expect to be populated
on local/aws boxes
"""

import json
import os


def extract_cloudfoundry_config():
    vcap_application = json.loads(os.environ.get("VCAP_APPLICATION"))
    os.environ["NOTIFY_ENVIRONMENT"] = vcap_application["space_name"]
    os.environ["NOTIFY_LOG_PATH"] = "/home/vcap/logs/app.log"
