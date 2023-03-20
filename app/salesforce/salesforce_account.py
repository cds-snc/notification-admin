import json

import requests
from flask import current_app


def get_accounts(export_url: str, github_token: str) -> dict[str, dict]:
    """Retrieves the exported Salesforce account data from GitHub. This purposefully
    swallows all errors and returns an empty dict if there's a problem.  This will allow
    the user registration flow to gracefully omit department selection if needed.

    Args:
        export_url (str): URL of the data export
        github_token (str): GitHub personal access token with access to the data export

    Returns:
        dict[str, dict]: The account data and localized name lists.
    """
    accounts = {}
    try:
        response = requests.get(export_url, headers={"Authorization": f"token {github_token}"})
        response.raise_for_status()

        account_data = json.loads(response.text)
        account_name_data = {
            "en": [item["name_eng"] for item in account_data],
            "fr": [item["name_fra"] for item in account_data],
        }
        accounts = {"all": account_data, "names": account_name_data}
    except Exception as error:
        current_app.logger.error("Salesforce failed to load account data export: %s", error)
    return accounts
