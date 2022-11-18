from typing import Optional, TypedDict

class EmailReplyTo(TypedDict):
    archived: bool
    created_at: str
    email_address: str
    id: str
    is_default: bool
    service_id: str
    updated_at: Optional[bool]
