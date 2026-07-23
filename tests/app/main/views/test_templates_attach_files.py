import io
import json
from unittest.mock import Mock

from notifications_python_client.errors import HTTPError

from app.main.views.templates import _build_file_upload_error_response


def _mock_file_upload(data=None, filename="test.pdf", mimetype="application/pdf"):
    """Helper to create a mock file upload."""
    file_content = data or b"test file content"
    file = io.BytesIO(file_content)
    file.filename = filename
    file.mimetype = mimetype
    return file


class TestBuildFileUploadErrorResponse:
    def test_over_file_limit_error_includes_usage_details(self):
        """Test that over_file_limit errors include usage breakdown."""
        error_response = Mock()
        error_response.status_code = 400
        error_response.text = json.dumps(
            {
                "error": "over_file_limit",
                "current_usage": 5000000,
                "requested": 2000000,
                "limit": 6291456,
            }
        )
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "over_file_limit"
        assert result["current_usage"] == 5000000
        assert result["requested"] == 2000000
        assert result["limit"] == 6291456

    def test_invalid_base64_error_returns_specific_error(self):
        """Test that invalid base64 errors are identified."""
        error_response = Mock()
        error_response.status_code = 400
        error_response.text = json.dumps({"error": "file_data is not valid base64"})
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "invalid_file_data"

    def test_over_file_limit_payload_takes_precedence_over_status_code(self):
        """Test that over_file_limit payload is preserved even if status is transformed."""
        error_response = Mock()
        error_response.status_code = 500
        error_response.text = json.dumps(
            {
                "error": "over_file_limit",
                "current_usage": 5000000,
                "requested": 2000000,
                "limit": 6291456,
            }
        )
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "over_file_limit"
        assert result["current_usage"] == 5000000
        assert result["requested"] == 2000000
        assert result["limit"] == 6291456

    def test_generic_400_error_returns_bad_request(self):
        """Test that generic 400 errors are identified."""
        error_response = Mock()
        error_response.status_code = 400
        error_response.text = json.dumps({"error": "some other error"})
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "bad_request"

    def test_403_error_returns_permission_denied(self):
        """Test that 403 errors are identified as permission errors."""
        error_response = Mock()
        error_response.status_code = 403
        error_response.text = json.dumps({})
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "permission_denied"

    def test_404_error_returns_not_found(self):
        """Test that 404 errors are identified as not found."""
        error_response = Mock()
        error_response.status_code = 404
        error_response.text = json.dumps({})
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "template_not_found"

    def test_500_error_returns_server_error(self):
        """Test that 500 errors are identified as server errors."""
        error_response = Mock()
        error_response.status_code = 500
        error_response.text = json.dumps({})
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "server_error"

    def test_unparseable_error_response(self):
        """Test handling of unparseable error responses."""
        error_response = Mock()
        error_response.status_code = 500
        error_response.text = "Not JSON"
        http_error = HTTPError(error_response)

        result = _build_file_upload_error_response(http_error)

        assert result["error"] == "server_error"
