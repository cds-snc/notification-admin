from datetime import datetime
from typing import Any, Optional, Tuple

from flask import current_app
from simple_salesforce import Salesforce

from app.models.user import User

from . import salesforce_contact
from .salesforce_auth import get_session
from .salesforce_utils import parse_result, query_one, query_param_sanitize

ENGAGEMENT_PRODUCT = "GC Notify"
ENGAGEMENT_TEAM = "Platform"
ENGAGEMENT_TYPE = "New Business"
ENGAGEMENT_STAGE_ACTIVATION = "Activation"
ENGAGEMENT_STAGE_LIVE = "Live"
ENGAGEMENT_STAGE_TRIAL = "Trial Account"


def create(service: dict[str, str], session: Salesforce = None) -> Tuple[bool, Optional[str]]:
    """Create a Salesforce Engagement for the given Notify service

    Args:
        service (dict[str, str]): The service's details for the engagement. This
        should include service ID, name, account ID, and optionally stage name.
        session (Salesforce): Existing Salesforce session. Defaults to None.

    Returns:
       Tuple[bool, Optional[str]]: Success indicator and the ID of the new Engagement
    """
    is_created = False
    engagement_id = None
    try:
        session = session if session else get_session()

        # Update the Salesforce contact with the Engagement's Account ID and retrieve
        # the Contact ID for the Engagement
        user = User.from_id(service["user_id"])
        is_updated, contact_id = salesforce_contact.update_account_id(user, service["account_id"], session)

        # Create the Engagemet
        if is_updated and contact_id:
            result = session.Opportunity.create(
                {
                    "Name": service["name"],
                    "AccountId": service["account_id"],
                    "ContactId": contact_id,
                    "CDS_Opportunity_Number__c": service["id"],
                    "StageName": service.get("stage_name", ENGAGEMENT_STAGE_TRIAL),
                    "CloseDate": datetime.today().strftime("%Y-%m-%d"),
                    "RecordTypeId": current_app.config["SALESFORCE_ENGAGEMENT_RECORD_TYPE"],
                    "Type": ENGAGEMENT_TYPE,
                    "CDS_Lead_Team__c": ENGAGEMENT_TEAM,
                    "Product_to_Add__c": ENGAGEMENT_PRODUCT,
                },
                headers={"Sforce-Duplicate-Rule-Header": "allowSave=true"},
            )
            is_created = parse_result(result, f"Salesforce Engagement create for service ID {service.get('id')}")
            engagement_id = result.get("Id")

    except Exception as ex:
        current_app.logger.error(f"Salesforce Engagement create failed: {ex}")
    return (is_created, engagement_id)


def update_stage(service: dict[str, str], session: Salesforce = None) -> Tuple[bool, Optional[str]]:
    """Update an Engagement.  If the Engagement does not
    exist, it is created.

    Args:
        service (dict[str, str]): The service's details for the engagement. This
        should include service ID, name, account ID, and optionally stage name.
        session (Salesforce): Existing Salesforce session. Defaults to None.

    Returns:
        Tuple[bool, Optional[str]]: Success indicator and the ID of the Engagement
    """
    is_updated = False
    engagement_id = None
    try:
        session = session if session else get_session()
        engagement = get_engagement_by_service_id(service.get("id", ""), session)

        # Existing Engagement, update the stage name
        if engagement:
            result = session.Opportunity.update(
                engagement.get("Id"),
                {"StageName": service.get("stage_name")},
                headers={"Sforce-Duplicate-Rule-Header": "allowSave=true"},
            )
            is_updated = parse_result(result, f"Salesforce Engagement update '{service}'")
            engagement_id = engagement.get("Id")
        # Create the Engagement.  This handles Notify services that were created before Salesforce was added.
        else:
            is_updated, engagement_id = create(service, session)

    except Exception as ex:
        current_app.logger.error(f"Salesforce Engagement update failed: {ex}")
    return (is_updated, engagement_id)


def get_engagement_by_service_id(service_id: str, session: Salesforce = None) -> Optional[dict[str, Any]]:
    """Retrieve a Salesforce Engagement by a Notify service ID

    Args:
        service_id (str): Notify service ID
        session (Salesforce): Existing Salesforce session. Defaults to None.

    Returns:
        Optional[dict[str, str]]: Salesforce Engagement details or None if can't be found
    """
    query = f"SELECT Id, Name, ContactId, AccountId FROM Opportunity where CDS_Opportunity_Number__c = '{query_param_sanitize(service_id)}' LIMIT 1"
    return query_one(query, session)
