import json
from logging import Logger
from typing import Any

import requests
from unidecode import unidecode


def get_accounts(export_url: str, github_token: str, logger: Logger) -> dict[str, Any]:
    """Retrieves the exported Salesforce account data from GitHub. This purposefully
    swallows all errors and returns an empty dict if there's a problem.  This will allow
    the user registration flow to gracefully omit department selection if needed.

    Args:
        export_url (str): URL of the data export
        github_token (str): GitHub personal access token with access to the data export
        logger (Logger): Logger instance to use.  This is needed as the `current_app` is not
        available at this point of the Flask app's initialization.

    Returns:
        dict[str, Any]: The account data and localized name lists.
    """
    accounts: dict[str, Any] = {"all": [], "names": {}}
    try:
        response = requests.get(export_url, headers={"Authorization": f"token {github_token}"})
        response.raise_for_status()

        account_data = json.loads(response.text)
        account_name_data = {
            "en": [item["name_eng"] for item in account_data],
            "fr": [item["name_fra"] for item in account_data],
        }
        # unidecode is needed so that names starting with accents like é
        # are sorted correctly
        sorted_account_name_data = {
            "en": sorted(account_name_data["en"], key=unidecode),
            "fr": sorted(account_name_data["fr"], key=unidecode),
        }
        accounts = {"all": account_data, "names": sorted_account_name_data}
    except Exception as error:
        logger.error("Salesforce failed to load account data export: %s", error)
    return accounts
