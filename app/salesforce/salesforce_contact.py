from typing import Optional, Tuple

from flask import current_app
from simple_salesforce import Salesforce

from app.models.user import User

from .salesforce_auth import get_session
from .salesforce_utils import (
    get_name_parts,
    parse_result,
    query_one,
    query_param_sanitize,
)


def create(user: User, account_id: str | None = None, session: Salesforce = None) -> Tuple[bool, Optional[str]]:
    """Create a Salesforce Contact from the given Notify User

    Args:
        user (User): Notify User that has just been activated.
        account_id (str | None, optional): ID of the Account to associate the Contact with.
        session (Salesforce | None, optional): Existing Salesforce session. Defaults to None.

    Returns:
        Tuple[bool, Optional[str]]: Success indicator and the ID of the new Contact
    """
    is_created = False
    contact_id = None
    try:
        session = session if session else get_session()
        name_parts = get_name_parts(user.name)
        result = session.Contact.create(
            {
                "FirstName": name_parts["first"] if name_parts["first"] else user.name,
                "LastName": name_parts["last"] if name_parts["last"] else "",
                "Title": user.id,
                "Email": user.email_address,
                "Phone": user.mobile_number,
                "AccountId": account_id,
            },
            headers={"Sforce-Duplicate-Rule-Header": "allowSave=true"},
        )
        is_created = parse_result(result, f"Salesforce Contact create for '{user.email_address}'")
        contact_id = result.get("Id")

    except Exception as ex:
        current_app.logger.error(f"Salesforce Contact create failed: {ex}")
    return (is_created, contact_id)


def update_account_id(user: User, account_id: str, session: Salesforce = None) -> Tuple[bool, Optional[str]]:
    """Update the Account ID of a Contact.  If the Contact does not
    exist, it is created.

    Args:
        user (User): Notify User object for the linked Contact to update
        account_id (str): ID of the Salesforce Account

    Returns:
         Tuple[bool, Optional[str]]: Success indicator and the ID of the Contact
    """
    is_updated = False
    contact_id = None
    try:
        session = session if session else get_session()
        contact = get_contact_by_user_id(user.id, session)

        # Existing contact, update the AccountID
        if contact:
            result = session.Contact.update(
                contact.get("Id"), {"AccountId": account_id}, headers={"Sforce-Duplicate-Rule-Header": "allowSave=true"}
            )
            is_updated = parse_result(result, f"Salesforce Contact update '{user.email_address}' with account ID '{account_id}'")
            contact_id = contact.get("Id")
        # Create the contact.  This handles Notify users that were created before Salesforce was added.
        else:
            is_updated, contact_id = create(user, account_id, session)

    except Exception as ex:
        current_app.logger.error(f"Salesforce Contact updated failed: {ex}")
    return (is_updated, contact_id)


def get_contact_by_user_id(user_id: str, session: Salesforce) -> Optional[dict[str, str]]:
    """Retrieve a Salesforce Contact by their Notify user ID.  If
    they can't be found, `None` is returned.

    Args:
        user_id (str): Notify user ID
        session (Salesforce | None, optional): Existing Salesforce session. Defaults to None.

    Returns:
        Optional[dict[str, str]]: Salesforce Contact details or None if can't be found
    """
    query = f"SELECT Id, FirstName, LastName, AccountId FROM Contact WHERE Title = '{query_param_sanitize(user_id)}' LIMIT 1"
    return query_one(query, session)
