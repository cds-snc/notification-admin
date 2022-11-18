from typing import TypedDict

class EmailReplyTo(TypedDict):
    id: str
    service_id: str
    email_address: str
    is_default: bool
    archived: bool
    # created_at: 
    # updated_at: bool