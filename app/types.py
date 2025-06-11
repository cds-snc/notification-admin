from typing import Optional, TypedDict


class AnnualData(TypedDict):
    """Contains annual notification counts for a service."""

    sms: int
    email: int


class MessageStatusCounts(TypedDict):
    """Contains counts and status information for a message type (sms or email)."""

    requested: int
    delivered: int
    failed: int
    failed_percentage: str
    show_warning: bool


class DashboardTotals(TypedDict):
    """Contains message status counts for different notification types."""

    sms: MessageStatusCounts
    email: MessageStatusCounts


class EmailReplyTo(TypedDict):
    archived: bool
    created_at: Optional[str]
    email_address: str
    id: str
    is_default: bool
    service_id: str
    updated_at: Optional[bool]
