from base64 import b64decode

from flask import current_app
from simple_salesforce import Salesforce


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
    except Exception as ex:
        current_app.logger.error(f"Salesforce login failed: {ex}")
    return session


def logout(session: Salesforce):
    """Logout of a Salesforce session

    Args:
        session (Salesforce): The session to revoke.
    """
    try:
        if session and session.session_id:
            session.oauth2("revoke", {"token": session.session_id}, method="POST")
    except Exception as ex:
        current_app.logger.error(f"Salesforce logout failed: {ex}")
