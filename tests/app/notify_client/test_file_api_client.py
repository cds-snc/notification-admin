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

    def test_get_file_contents_returns_stub_example_file(self):
        client = FileApiClient()

        ret = client.get_file_contents("template-id", "file-id")

        assert ret["filename"] == "example-file-id.txt"
        assert ret["mime_type"] == "text/plain"
        assert b"template-id" in ret["content"]
        assert b"file-id" in ret["content"]


def test_singleton_client_exposes_methods():
    assert file_api_client is not None
