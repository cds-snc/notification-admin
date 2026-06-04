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
        }
        return self.post(f"/templates/{template_id}/files", data)

    def get_files_by_template_id(self, template_id):
        return self.get(f"/templates/{template_id}/files")

    def get_file_status(self, template_id, file_id):
        return self.get(f"/templates/{template_id}/files/{file_id}/status")

    def delete_file(self, template_id, file_id):
        return self.delete(f"/templates/{template_id}/files/{file_id}", {})

    def update_file_status(self, template_id, file_id, status):
        return self.post(f"/templates/{template_id}/files/{file_id}/status", {"status": status})


file_api_client = FileApiClient()
