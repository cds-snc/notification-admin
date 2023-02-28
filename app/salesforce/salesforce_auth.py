from base64 import b64decode

from flask import current_app
from simple_salesforce import Salesforce
from simple_salesforce.exceptions import SalesforceAuthenticationFailed


def get_session() -> Salesforce | None:
    """Return an authenticated Salesforce session

    Returns:
        Salesforce | None: the authenticated session on success, otherwise None
    """
    session = None
    try:
        session = Salesforce(
            client_id=current_app.config["SALESFORCE_CLIENT_ID"],
            username=current_app.config["SALESFORCE_USERNAME"],
            consumer_key=current_app.config["SALESFORCE_CLIENT_KEY"],
            privatekey=b64decode(current_app.config["SALESFORCE_CLIENT_PRIVATEKEY"]),
            domain=current_app.config["SALESFORCE_DOMAIN"],
        )
    except SalesforceAuthenticationFailed as auth_failure:
        current_app.logger.error(f"Salesforce login failed: {auth_failure}")

    return session
