import base64

from flask_login import current_user

from app.notify_client import NotifyAdminAPIClient


class FileApiClient(NotifyAdminAPIClient):
    @staticmethod
    def _url(service_id, template_id, suffix=""):
        return f"/service/{service_id}/template/{template_id}/files{suffix}"

    def create_file(self, service_id, template_id, type_, name, mime_type, file_size, file_data):
        data = {
            "type": type_,
            "name": name,
            "mime_type": mime_type,
            "file_size": file_size,
            "file_data": file_data,
            "created_by": current_user.id,
        }
        return self.post(self._url(service_id, template_id), data)

    def get_files_by_template_id(self, service_id, template_id):
        return self.get(self._url(service_id, template_id))

    def get_file_status(self, service_id, template_id, file_id):
        return self.get(self._url(service_id, template_id, f"/{file_id}/status"))

    def get_file_contents(self, service_id, template_id, file_id):
        response = self.get(self._url(service_id, template_id, f"/{file_id}/download"))

        return {
            "filename": response["name"],
            "mime_type": response["mime_type"],
            "content": base64.b64decode(response["file_data"]),
        }

    def delete_file(self, service_id, template_id, file_id):
        return self.delete(self._url(service_id, template_id, f"/{file_id}"), {})

    def update_file_status(self, service_id, template_id, file_id, status):
        return self.post(self._url(service_id, template_id, f"/{file_id}/status"), {"status": status})


file_api_client = FileApiClient()
