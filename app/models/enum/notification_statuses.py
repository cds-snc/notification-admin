from enum import Enum


class NotificationStatuses(Enum):
    CANCELLED = "cancelled"
    CREATED = "created"
    DELIVERED = "delivered"
    FAILED = "failed"
    PENDING = "pending"
    PENDING_VIRUS_CHECK = "pending-virus-check"
    PERMANENT_FAILURE = "permanent-failure"
    PII_CHECK_FAILED = "pii-check-failed"
    RETURNED_LETTER = "returned-letter"
    SENDING = "sending"
    SENT = "sent"
    TECHNICAL_FAILURE = "technical-failure"
    TEMPORARY_FAILURE = "temporary-failure"
    VALIDATION_FAILED = "validation-failed"
    VIRUS_SCAN_FAILED = "virus-scan-failed"
