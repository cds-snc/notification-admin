from datetime import datetime
from typing import Any

from flask import current_app
from simple_salesforce import Salesforce

from .salesforce_auth import get_session
from .salesforce_utils import parse_result, query_one, query_param_sanitize

ENGAGEMENT_PRODUCT = "GC Notify"
ENGAGEMENT_TEAM = "Platform"
ENGAGEMENT_TYPE = "New Business"
ENGAGEMENT_STAGE_LIVE = "Live"
ENGAGEMENT_STAGE_TRIAL = "Trial Account"


def create(service: dict[str, str], session: Salesforce = None) -> bool:
    """Create a Salesforce Engagement for the given Notify service

    Args:
        service (dict[str, str]): The service's details for the engagement. This
        should include service ID, name, account ID, contact ID and optionally stage name.
        session (Salesforce): Existing Salesforce session. Defaults to None.

    Returns:
        bool: was the Engagement created?
    """
    is_created = False
    try:
        session = session if session else get_session()
        result = session.Opportunity.create(
            {
                "Name": service.get("name"),
                "AccountId": service.get("account_id"),
                "ContactId": service.get("contact_id"),
                "CDS_Opportunity_Number__c": service.get("id"),
                "StageName": service.get("stage_name", ENGAGEMENT_STAGE_TRIAL),
                "CloseDate": datetime.today().strftime("%Y-%m-%d"),
                "RecordTypeId": current_app.config["SALESFORCE_ENGAGEMENT_RECORD_TYPE"],
                "Type": ENGAGEMENT_TYPE,
                "CDS_Lead_Team__c": ENGAGEMENT_TEAM,
                "Product_to_Add__c": ENGAGEMENT_PRODUCT,
            }
        )
        is_created = parse_result(result, f"Salesforce Engagement create for service ID {service.get('id')}")

    except Exception as ex:
        current_app.logger.error(f"Salesforce Engagement create failed: {ex}")
    return is_created


def update_stage(service: dict[str, str], session: Salesforce = None) -> bool:
    """Update an Engagement.  If the Engagement does not
    exist, it is created.

    Args:
        service (dict[str, str]): The service's details for the engagement. This
        should include service ID, name, account ID, contact ID and optionally stage name.
        session (Salesforce): Existing Salesforce session. Defaults to None.

    Returns:
        bool: Was the Engagement updated?
    """
    is_updated = False
    try:
        session = session if session else get_session()
        engagement = get_engagement_by_service_id(service.get("id", ""), session)

        # Existing Engagement, update the stage name
        if engagement:
            result = session.Opportunity.update(engagement.get("Id"), {"StageName": service.get("stage_name")})
            is_updated = parse_result(result, f"Salesforce Engagement update '{service}'")
        # Create the Engagement.  This handles Notify services that were created before Salesforce was added.
        else:
            is_updated = create(service, session)

    except Exception as ex:
        current_app.logger.error(f"Salesforce Engagement update failed: {ex}")
    return is_updated


def get_engagement_by_service_id(service_id: str, session: Salesforce = None) -> dict[str, Any] | None:
    """Retrieve a Salesforce Engagement by a Notify service ID

    Args:
        service_id (str): Notify service ID
        session (Salesforce): Existing Salesforce session. Defaults to None.

    Returns:
        dict[str, str] | None: Salesforce Engagement details or None if can't be found
    """
    query = f"SELECT Id, Name, ContactId, AccountId FROM Opportunity where CDS_Opportunity_Number__c = '{query_param_sanitize(service_id)}' LIMIT 1"
    return query_one(query, session)
