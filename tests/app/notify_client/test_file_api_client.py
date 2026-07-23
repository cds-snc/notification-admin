import pytest
from notifications_python_client.errors import HTTPError

from app.notify_client.file_api_client import FileApiClient, file_api_client


class TestFileApiClient:
    def test_get_files_by_template_id(self, mocker):
        client = FileApiClient()
        mock_get = mocker.patch.object(client, "get", return_value=[])

        ret = client.get_files_by_template_id("template-id")

        assert ret == []
        mock_get.assert_called_once_with("/templates/template-id/files")

    def test_create_file(self, mocker):
        client = FileApiClient()
        mocker.patch("app.notify_client.file_api_client.current_user", new=mocker.Mock(id="test-user-id"))
        mock_post = mocker.patch.object(client, "post", return_value={"id": "file-id"})

        ret = client.create_file(
            "template-id",
            "upload_document",
            "report.pdf",
            "application/pdf",
            1234,
            "Zm9v",
        )

        assert ret == {"id": "file-id"}
        mock_post.assert_called_once_with(
            "/templates/template-id/files",
            {
                "template_id": "template-id",
                "type": "upload_document",
                "name": "report.pdf",
                "mime_type": "application/pdf",
                "file_size": 1234,
                "file_data": "Zm9v",
                "created_by": "test-user-id",
            },
        )

    def test_create_file_raises_http_error_on_api_error(self, mocker):
        client = FileApiClient()
        mocker.patch("app.notify_client.file_api_client.current_user", new=mocker.Mock(id="test-user-id"))

        error_response = mocker.Mock()
        error_response.status_code = 400
        error_response.text = '{"error": "over_file_limit"}'
        http_error = HTTPError(error_response)

        mocker.patch.object(client, "post", side_effect=http_error)

        with pytest.raises(HTTPError) as excinfo:
            client.create_file(
                "template-id",
                "upload_document",
                "large-file.pdf",
                "application/pdf",
                2000000,
                "base64data",
            )

        assert excinfo.value is http_error

    def test_delete_file(self, mocker):
        client = FileApiClient()
        mock_delete = mocker.patch.object(client, "delete", return_value=None)

        client.delete_file("template-id", "file-id")

        mock_delete.assert_called_once_with("/templates/template-id/files/file-id", {})

    def test_update_file_status(self, mocker):
        client = FileApiClient()
        mock_post = mocker.patch.object(client, "post", return_value={"status": "uploaded"})

        ret = client.update_file_status("template-id", "file-id", "uploaded")

        assert ret == {"status": "uploaded"}
        mock_post.assert_called_once_with(
            "/templates/template-id/files/file-id/status",
            {"status": "uploaded"},
        )

    def test_get_file_contents_decodes_base64_response(self, mocker):
        import base64

        client = FileApiClient()
        expected_content = b"Example content for template-id, file-id."
        file_data = base64.b64encode(expected_content).decode("ascii")
        mock_get = mocker.patch.object(
            client,
            "get",
            return_value={
                "name": "example-file-id.txt",
                "mime_type": "text/plain",
                "file_data": file_data,
                "file_size": 100,
            },
        )

        ret = client.get_file_contents("template-id", "file-id")

        assert ret["filename"] == "example-file-id.txt"
        assert ret["mime_type"] == "text/plain"
        assert ret["content"] == expected_content
        mock_get.assert_called_once_with("/templates/template-id/files/file-id/download")


def test_singleton_client_exposes_methods():
    assert file_api_client is not None
