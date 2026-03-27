from datetime import datetime

from flask import abort

from app.models import JSONModel, ModelList
from app.notify_client.service_api_client import service_api_client
from app.utils import to_utc_string


class UnsubscribeRequestsReport(JSONModel):
    ALLOWED_PROPERTIES = {
        "service_id",
        "count",
        "batch_id",
        "is_a_batched_report",
        "will_be_archived_at",
        "earliest_timestamp",
        "latest_timestamp",
        "processed_by_service_at",
        "created_at",
    }

    def __init__(self, _dict):
        super().__init__(_dict)
        # Parse datetime strings into datetime objects when present
        for field in ("earliest_timestamp", "latest_timestamp", "will_be_archived_at"):
            if _dict and _dict.get(field):
                self._dict[field] = datetime.fromisoformat(_dict[field].replace("Z", "+00:00"))
        for field in ("processed_by_service_at", "created_at"):
            if _dict and _dict.get(field):
                self._dict[field] = datetime.fromisoformat(_dict[field].replace("Z", "+00:00"))

    @property
    def status(self):
        if not self.is_a_batched_report:
            return "Not downloaded"
        if not self.processed_by_service_at:
            return "Downloaded"
        return "Completed"

    @property
    def completed(self):
        return self.processed_by_service_at is not None

    @property
    def title(self):
        """Human-readable date range title for the report."""
        earliest = self.earliest_timestamp
        latest = self.latest_timestamp
        if earliest is None or latest is None:
            return "Unsubscribe requests"
        earliest_str = earliest.strftime("%-d %B %Y")
        latest_str = latest.strftime("%-d %B %Y")
        if earliest_str == latest_str:
            return earliest_str
        return f"{earliest_str} to {latest_str}"


class UnsubscribeRequestsReports(ModelList):
    """A list of UnsubscribeRequestsReport objects for a service."""

    @property
    def client(self):
        return None  # overridden via _get_items

    @property
    def model(self):
        return UnsubscribeRequestsReport

    @staticmethod
    def _get_items(service_id):
        return service_api_client.get_unsubscribe_reports_summary(service_id)

    def __init__(self, service_id):
        self.items = self._get_items(service_id)

    def __getitem__(self, index):
        instance = self.model(self.items[index])
        instance.all_reports = self
        return instance

    def __len__(self):
        return len(self.items)

    def get_by_batch_id(self, batch_id):
        for item in self.items:
            if item.get("batch_id") == str(batch_id):
                report = self.model(item)
                report.all_reports = self
                return report
        abort(404)

    def get_unbatched_report(self):
        for item in self.items:
            if not item.get("is_a_batched_report"):
                report = self.model(item)
                report.all_reports = self
                return report
        abort(404)

    def batch_unbatched(self):
        unbatched = self.get_unbatched_report()
        created = service_api_client.create_unsubscribe_request_report(
            unbatched.service_id,
            {
                "count": unbatched.count,
                "earliest_timestamp": to_utc_string(unbatched.earliest_timestamp),
                "latest_timestamp": to_utc_string(unbatched.latest_timestamp),
            },
        )
        return created["report_id"]
