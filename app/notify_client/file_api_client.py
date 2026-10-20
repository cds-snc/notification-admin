import base64

from flask_login import current_user

from app.notify_client import NotifyAdminAPIClient


class FileApiClient(NotifyAdminAPIClient):
    def create_file(self, template_id, type_, name, mime_type, file_size, file_data):
        data = {
            "template_id": str(template_id),
            "type": type_,
            "name": name,
            "mime_type": mime_type,
            "file_size": file_size,
            "file_data": file_data,
            "created_by": current_user.id,
        }
        return self.post(f"/templates/{template_id}/files", data)

    def get_files_by_template_id(self, service_id, template_id):
        return self.get(f"/templates/{template_id}/files", params={"service_id": service_id})

    def get_file_status(self, service_id, template_id, file_id):
        return self.get(f"/templates/{template_id}/files/{file_id}/status", params={"service_id": service_id})

    def get_file_contents(self, service_id, template_id, file_id):
        response = self.get(f"/templates/{template_id}/files/{file_id}/download", params={"service_id": service_id})

        return {
            "filename": response["name"],
            "mime_type": response["mime_type"],
            "content": base64.b64decode(response["file_data"]),
        }

    def delete_file(self, service_id, template_id, file_id):
        return self.delete(f"/templates/{template_id}/files/{file_id}?service_id={service_id}", {})

    def update_file_status(self, template_id, file_id, status):
        return self.post(f"/templates/{template_id}/files/{file_id}/status", {"status": status})


file_api_client = FileApiClient()
