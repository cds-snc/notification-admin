from app.notify_client import NotifyAdminAPIClient


class ReportsApiClient(NotifyAdminAPIClient):
    def request_report(self, user_id, service_id, report_type, language, job_id=None):
        data = {
            "requesting_user_id": user_id,
            "service_id": service_id,
            "report_type": report_type,
            "language": language,
            "job_id": job_id,
        }
        self.post(f"/service/{service_id}/report", data=data)

    def get_reports_for_service(self, service_id):
        response = self.get(f"/service/{service_id}/report")
        return response["data"]


reports_api_client = ReportsApiClient()
