from enum import Enum

import requests
from flask import current_app

REQUEST_TIMEOUT = 15  # seconds


class ScanVerdicts(Enum):
    IN_PROGRESS = "in_progress"
    CLEAN = "clean"
    SUSPICIOUS = "suspicious"
    MALICIOUS = "malicious"
    ERROR = "error"
    UNKNOWN = "unknown"
    UNABLE_TO_SCAN = "unable_to_scan"


class ScanFilesApiClient:
    def init_app(self, url, auth_token):
        self.scanfiles_url = url
        self.auth_token = auth_token

    def is_unsafe(self, file):
        """
        Checks if a file is considered unsafe by sending it to the scanfiles API.

        Args:
            file (bytes): The path to the file to be scanned.

        Returns:
            bool: True if the file is considered unsafe, False otherwise.
        """
        data = {"file": file}
        headers = {
            "Authorization": self.auth_token,
        }

        try:
            response = requests.post(self.scanfiles_url, files=data, headers=headers, timeout=15)
        except Exception as e:
            current_app.logger.info("ScanFilesApiClient: Exception raised while scanning file. Error: {}".format(str(e)))
            return False

        if response.status_code == 200:
            response_data = response.json()
            verdict = response_data["verdict"]

            current_app.logger.debug(
                "ScanFilesApiClient: request successful. Scan result: {}. Response data: {}".format(
                    response_data["verdict"], response_data
                )
            )

            if verdict == ScanVerdicts.SUSPICIOUS.value or verdict == ScanVerdicts.MALICIOUS.value:
                return True

            # all other verdicts
            return False
        else:
            current_app.logger.info("ScanFilesApiClient: Failed to scan file [status code != 200]. Response {}".format(str(response)))
            return False


scanfiles_api_client = ScanFilesApiClient()
