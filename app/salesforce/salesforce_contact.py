from typing import Any, Optional

from flask import current_app
from simple_salesforce import Salesforce
from simple_salesforce.exceptions import SalesforceError

from app.models.user import User

from .salesforce_auth import get_session


def create(user: User, account_id: str | None = None, session: Salesforce = None) -> bool:
    """Create a Salesforce Contact from the given Notify User

    Args:
        user (User): Notify User that has just been activated.
        account_id (str | None, optional): ID of the Account to associate the Contact with.
        session (Salesforce | None, optional): Existing Salesforce session. Defaults to None.

    Returns:
        bool: Was the Contact created?
    """
    is_created = False
    try:
        session = session if session else get_session()
        name_parts = get_name_parts(user.name)
        contact = {
            "FirstName": name_parts["first"] if name_parts["first"] else user.name,
            "LastName": name_parts["last"] if name_parts["last"] else "",
            "Email": user.email_address,
            "Phone": user.mobile_number,
            "AccountId": account_id,
        }
        # if account_id:
        #     contact["AccountId"] = account_id

        result = session.Contact.create(contact)
        is_created = parse_result(result, f"Salesforce Contact create for '{user.email_address}'")

    except SalesforceError as salesforce_error:
        current_app.logger.error(f"Salesforce Contact create failed: {salesforce_error}")
    except Exception as ex:
        current_app.logger.error(f"Salesforce Contact create failed with uncaught exception: {ex}")
    return is_created


def update_account_id(user: User, account_id: str, session: Salesforce = None) -> bool:
    """Update the Account ID of a Contact.  If the Contact does not
    exist, it is created.

    Args:
        email (str): Email address of the contact to update
        account_id (str): ID of the Salesforce Account

    Returns:
        bool: Was the Contact updated?
    """
    is_updated = False
    try:
        session = session if session else get_session()
        contact = get_contact_by_email(user.email_address, session)

        # Existing contact, update the AccountID
        if contact:
            result = session.Contact.update(contact["Id"], {"AccountId": account_id})
            is_updated = parse_result(result, f"Salesforce Contact update '{user.email_address}' with account ID '{account_id}'")
        # Create the contact.  This handles Notify users that were created before Salesforce was added.
        else:
            is_updated = create(user, account_id, session)

    except SalesforceError as salesforce_error:
        current_app.logger.error(f"Salesforce Contact updated failed: {salesforce_error}")
    except Exception as ex:
        current_app.logger.error(f"Salesforce Contact updated failed with uncaught exception: {ex}")
    return is_updated


def get_contact_by_email(email: str, session: Salesforce = None) -> dict[str, str] | None:
    """Retrieve a Salesforce Contact by their email address.  If
    they can't be found, `None` is returned.

    Args:
        email (str): Email of the Salesforce Contact to retrieve
        session (Salesforce | None, optional): Existing Salesforce session. Defaults to None.

    Returns:
        dict[str, str] | None: Salesforce Contact details no None if can't be found
    """
    contact = None
    try:
        session = session if session else get_session()
        result = session.query(f"SELECT Id, FirstName, LastName, AccountId FROM Contact WHERE Email = '{email}' LIMIT 1")
        if len(result) == 1:
            contact = result[0]
        else:
            current_app.logger.warn(f"Salesforce Contact not found for email '{email}'")

    except SalesforceError as salesforce_error:
        current_app.logger.error(f"Salesforce Contact lookup failed: {salesforce_error}")
    except Exception as ex:
        current_app.logger.error(f"Salesforce Contact lookup failed with uncaught exception: {ex}")
    return contact


def parse_result(result: dict[str, Any], op: str) -> bool:
    """Parse a Salesforce API result object and log the result

    Args:
        result (dict[str, any]): Salesforce API result object
        op (str): The operation we're logging

    Returns:
        bool: Did the operation work?
    """
    is_success = result.get("success", False)
    if is_success:
        current_app.logger.info(f"{op} succeeded")
    else:
        current_app.logger.error(f"{op} failed: {result.get('error')}")
    return is_success


def get_name_parts(full_name: str) -> dict[str, Optional[str]]:
    """
    Splits a space separated fullname into first and last
    name parts.  If the name cannot be split, the first
    name part will

    Args:
        full_name (str): The space seperated full name

    Returns:
        dict[str, str]: The first and last name parts
    """
    name_parts = full_name.split()
    return {
        "first": name_parts[0] if len(name_parts) > 0 else None,
        "last": " ".join(name_parts[1:]) if len(name_parts) > 1 else None,
    }
