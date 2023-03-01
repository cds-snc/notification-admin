from typing import Optional

from flask import current_app
from simple_salesforce.exceptions import SalesforceError

from app.models.user import User

from .salesforce_auth import get_session


def create(user: User) -> bool:
    """Create a Salesforce Contact from the given Notify User

    Args:
        user (User): Notify User that has just been activated

    Returns:
        bool: Was the Contact created?
    """
    is_created = False
    session = get_session()
    if session:
        name_parts = get_name_parts(user.name)
        try:
            result = session.Contact.create(
                {
                    "FirstName": name_parts["first"] if name_parts["first"] else user.name,
                    "LastName": name_parts["last"] if name_parts["last"] else "",
                    "Email": user.email_address,
                    "Phone": user.mobile_number,
                }
            )
            if result["success"]:
                current_app.logger.info(f"Salesforce Contact created for: {user.email_address}")
                is_created = True
            else:
                current_app.logger.error(f"Salesforce Contact create failed: {result['errors']}")

        except SalesforceError as salesforce_error:
            current_app.logger.error(f"Salesforce Contact create failed: {salesforce_error}")
        except Exception as ex:
            current_app.logger.error(f"Salesforce Contact create failed with uncaught exception: {ex}")
    return is_created


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
