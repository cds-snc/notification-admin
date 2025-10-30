from datetime import datetime
from unittest.mock import mock_open, patch

import pytest
import yaml

from app.sample_template_utils import (
    _load_sample_templates_from_files,
    clear_sample_template_cache,
    create_temporary_sample_template,
    get_sample_template_by_id,
    get_sample_templates,
    get_sample_templates_by_type,
)


class TestSampleTemplateUtils:
    """Test class for sample_template_utils functions."""

    @pytest.fixture
    def sample_template_data(self):
        """Mock sample template data that would be loaded from YAML files."""
        return [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "template_name": {"en": "Welcome Email", "fr": "Courriel de bienvenue"},
                "notification_type": "email",
                "template_category": "authentication",
                "subject": "Welcome!",
                "content": "Welcome to our service!",
                "example_content": "Welcome Jane Smith to our service!",
                "pinned": False,
                "filename": "welcome_email.yaml",
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "template_name": {"en": "SMS Reminder", "fr": "Rappel SMS"},
                "notification_type": "sms",
                "template_category": "reminder",
                "content": "Your appointment is tomorrow at ((time))",
                "example_content": "Your appointment is tomorrow at 2:00 PM",
                "pinned": True,
                "filename": "sms_reminder.yaml",
            },
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "template_name": {"en": "Another Email", "fr": "Autre courriel"},
                "notification_type": "email",
                "template_category": "notification",
                "subject": "Important Update",
                "content": "We have an important update for you.",
                "example_content": "We have an important update for you, John.",
                "pinned": False,
                "filename": "another_email.yaml",
            },
        ]

    @pytest.fixture
    def mock_template_categories(self):
        """Mock template categories from API."""
        return [
            {"id": "cat-1", "name_en": "Authentication", "name_fr": "Authentification"},
            {"id": "cat-2", "name_en": "Reminder", "name_fr": "Rappel"},
            {"id": "cat-3", "name_en": "Notification", "name_fr": "Notification"},
        ]

    @pytest.fixture(autouse=True)
    def clear_cache_after_test(self):
        """Clear cache after each test to ensure clean state."""
        yield
        clear_sample_template_cache()

    def test_get_sample_templates_returns_cached_data(self, sample_template_data, app_):
        """Test that get_sample_templates returns cached template data."""
        with patch("app.sample_template_utils._load_sample_templates_from_files", return_value=sample_template_data) as mock_load:
            with app_.app_context():
                # First call should load from files
                result = get_sample_templates()
                assert result == sample_template_data
                assert mock_load.call_count == 1

                # Second call should use cache, not call _load_sample_templates_from_files again
                result2 = get_sample_templates()
                assert result2 == sample_template_data
                assert mock_load.call_count == 1  # Still only called once

    def test_get_sample_templates_returns_empty_list_when_no_templates(self, app_):
        """Test that get_sample_templates returns empty list when no templates exist."""
        with patch("app.sample_template_utils._load_sample_templates_from_files", return_value=[]):
            with app_.app_context():
                result = get_sample_templates()
                assert result == []

    def test_get_sample_template_by_id_returns_correct_template(self, sample_template_data, app_):
        """Test that get_sample_template_by_id returns the correct template."""
        with patch("app.sample_template_utils.get_sample_templates", return_value=sample_template_data):
            with app_.app_context():
                # Test finding an existing template
                result = get_sample_template_by_id("22222222-2222-2222-2222-222222222222")
                assert result is not None
                assert result["id"] == "22222222-2222-2222-2222-222222222222"
                assert result["template_name"]["en"] == "SMS Reminder"
                assert result["notification_type"] == "sms"

    def test_get_sample_template_by_id_returns_none_for_nonexistent_template(self, sample_template_data, app_):
        """Test that get_sample_template_by_id returns None for non-existent template."""
        with patch("app.sample_template_utils.get_sample_templates", return_value=sample_template_data):
            with app_.app_context():
                result = get_sample_template_by_id("99999999-9999-9999-9999-999999999999")
                assert result is None

    def test_get_sample_template_by_id_returns_none_for_empty_template_list(self, app_):
        """Test that get_sample_template_by_id returns None when template list is empty."""
        with patch("app.sample_template_utils.get_sample_templates", return_value=[]):
            with app_.app_context():
                result = get_sample_template_by_id("11111111-1111-1111-1111-111111111111")
                assert result is None

    def test_get_sample_templates_by_type_filters_correctly(self, sample_template_data, app_):
        """Test that get_sample_templates_by_type filters templates by notification type."""
        with patch("app.sample_template_utils.get_sample_templates", return_value=sample_template_data):
            with app_.app_context():
                # Test filtering by email type
                email_templates = get_sample_templates_by_type("email")
                assert len(email_templates) == 2
                assert all(template["notification_type"] == "email" for template in email_templates)

                # Test filtering by sms type
                sms_templates = get_sample_templates_by_type("sms")
                assert len(sms_templates) == 1
                assert sms_templates[0]["notification_type"] == "sms"
                assert sms_templates[0]["template_name"]["en"] == "SMS Reminder"

    def test_get_sample_templates_by_type_returns_empty_for_nonexistent_type(self, sample_template_data, app_):
        """Test that get_sample_templates_by_type returns empty list for non-existent type."""
        with patch("app.sample_template_utils.get_sample_templates", return_value=sample_template_data):
            with app_.app_context():
                result = get_sample_templates_by_type("letter")
                assert result == []

    def test_get_sample_templates_by_type_returns_empty_for_empty_template_list(self, app_):
        """Test that get_sample_templates_by_type returns empty list when template list is empty."""
        with patch("app.sample_template_utils.get_sample_templates", return_value=[]):
            with app_.app_context():
                result = get_sample_templates_by_type("email")
                assert result == []

    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_load_sample_templates_from_files_loads_yaml_files(self, mock_yaml_load, mock_file_open, mock_listdir, app_):
        """Test that _load_sample_templates_from_files correctly loads YAML files."""
        # Mock the directory listing
        mock_listdir.return_value = ["template1.yaml", "template2.yml", ".hidden.yaml", "not_yaml.txt"]

        # Mock YAML content
        template1_data = {
            "id": "11111111-1111-1111-1111-111111111111",
            "template_name": {"en": "Template 1", "fr": "Modèle 1"},
            "notification_type": "email",
            "pinned": True,
        }
        template2_data = {
            "id": "22222222-2222-2222-2222-222222222222",
            "template_name": {"en": "Template 2", "fr": "Modèle 2"},
            "notification_type": "sms",
            "pinned": False,
        }

        # Configure yaml.safe_load to return different data for each file
        mock_yaml_load.side_effect = [template1_data, template2_data]

        with app_.app_context():
            result = _load_sample_templates_from_files()

            # Should have loaded 2 valid YAML files (ignoring .hidden.yaml and not_yaml.txt)
            assert len(result) == 2

            # Check that filenames were added
            assert result[0]["filename"] == "template1.yaml"
            assert result[1]["filename"] == "template2.yml"

            # Check sorting: pinned templates first, then by name
            # Template 1 is pinned, so it should come first
            assert result[0]["pinned"] is True
            assert result[0]["template_name"]["en"] == "Template 1"
            assert result[1]["pinned"] is False
            assert result[1]["template_name"]["en"] == "Template 2"

    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_load_sample_templates_from_files_handles_yaml_error(self, mock_yaml_load, mock_file_open, mock_listdir, app_):
        """Test that _load_sample_templates_from_files handles YAML parsing errors gracefully."""
        mock_listdir.return_value = ["valid.yaml", "invalid.yaml"]

        # First file loads successfully, second file has YAML error
        valid_data = {"id": "11111111-1111-1111-1111-111111111111", "template_name": {"en": "Valid"}}
        mock_yaml_load.side_effect = [valid_data, yaml.YAMLError("Invalid YAML")]

        with app_.app_context():
            result = _load_sample_templates_from_files()

            # Should only return the valid template
            assert len(result) == 1
            assert result[0]["template_name"]["en"] == "Valid"

    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_load_sample_templates_from_files_ignores_empty_files(self, mock_yaml_load, mock_file_open, mock_listdir, app_):
        """Test that _load_sample_templates_from_files ignores empty YAML files."""
        mock_listdir.return_value = ["template.yaml", "empty.yaml"]

        valid_data = {"id": "11111111-1111-1111-1111-111111111111", "template_name": {"en": "Valid"}}
        mock_yaml_load.side_effect = [valid_data, None]  # Second file is empty

        with app_.app_context():
            result = _load_sample_templates_from_files()

            # Should only return the valid template, ignore the empty one
            assert len(result) == 1
            assert result[0]["template_name"]["en"] == "Valid"

    @patch("os.listdir")
    @patch("builtins.open", new_callable=mock_open)
    @patch("yaml.safe_load")
    def test_load_sample_templates_from_files_sorts_templates_correctly(self, mock_yaml_load, mock_file_open, mock_listdir, app_):
        """Test that _load_sample_templates_from_files sorts templates correctly (pinned first, then alphabetically)."""
        mock_listdir.return_value = ["c.yaml", "a.yaml", "b.yaml"]

        # Create templates with different pinned status and names
        template_c = {"template_name": {"en": "C Template"}, "pinned": False}
        template_a = {"template_name": {"en": "A Template"}, "pinned": True}  # Pinned
        template_b = {"template_name": {"en": "B Template"}, "pinned": False}

        mock_yaml_load.side_effect = [template_c, template_a, template_b]

        with app_.app_context():
            result = _load_sample_templates_from_files()

            # Should be sorted: pinned first (A), then alphabetically (B, C)
            assert len(result) == 3
            assert result[0]["template_name"]["en"] == "A Template"  # Pinned, so first
            assert result[1]["template_name"]["en"] == "B Template"  # Alphabetically before C
            assert result[2]["template_name"]["en"] == "C Template"

    def test_clear_sample_template_cache_clears_all_caches(self, app_):
        """Test that clear_sample_template_cache clears all memoized functions."""
        with app_.app_context():
            # Mock the cache delete methods
            with patch("app.extensions.cache.delete_memoized") as mock_delete:
                clear_sample_template_cache()

                # Should call delete_memoized for all three cached functions
                assert mock_delete.call_count == 3
                mock_delete.assert_any_call(get_sample_templates)
                mock_delete.assert_any_call(get_sample_template_by_id)
                mock_delete.assert_any_call(get_sample_templates_by_type)

    @patch("app.sample_template_utils.template_category_api_client.get_all_template_categories")
    def test_create_temporary_sample_template_success(
        self, mock_get_categories, sample_template_data, mock_template_categories, app_
    ):
        """Test successful creation of temporary sample template."""
        mock_get_categories.return_value = mock_template_categories
        current_user_id = "user-123"

        with patch("app.sample_template_utils.get_sample_template_by_id", return_value=sample_template_data[0]):
            with app_.app_context():
                result = create_temporary_sample_template(
                    template_id="11111111-1111-1111-1111-111111111111", current_user_id=current_user_id
                )

                # Check basic template data mapping
                assert result["id"] == "11111111-1111-1111-1111-111111111111"
                assert result["name"] == "Welcome Email"
                assert result["name_fr"] == "Courriel de bienvenue"
                assert result["content"] == "Welcome Jane Smith to our service!"
                assert result["subject"] == "Welcome!"
                assert result["template_type"] == "email"
                assert result["created_by"] == current_user_id
                assert result["archived"] is False
                assert result["version"] == 1

                # Check template category mapping by English name
                assert result["template_category_id"] == "cat-1"  # Authentication category
                assert result["template_category"]["name_en"] == "Authentication"

    @patch("app.sample_template_utils.template_category_api_client.get_all_template_categories")
    def test_create_temporary_sample_template_matches_french_category(self, mock_get_categories, mock_template_categories, app_):
        """Test that create_temporary_sample_template matches categories by French name."""
        mock_get_categories.return_value = mock_template_categories

        # Template with French category name
        template_with_french_category = {
            "id": "test-id",
            "template_name": {"en": "Test", "fr": "Test FR"},
            "template_category": "rappel",  # French name for "reminder"
            "subject": "Test Subject",
            "example_content": "Test content",
            "notification_type": "email",
        }

        with patch("app.sample_template_utils.get_sample_template_by_id", return_value=template_with_french_category):
            with app_.app_context():
                result = create_temporary_sample_template(template_id="test-id", current_user_id="user-123")

                # Should match the Reminder category by French name
                assert result["template_category_id"] == "cat-2"
                assert result["template_category"]["name_fr"] == "Rappel"

    def test_create_temporary_sample_template_template_not_found(self, app_):
        """Test create_temporary_sample_template raises error when template not found."""
        with patch("app.sample_template_utils.get_sample_template_by_id", return_value=None):
            with app_.app_context():
                with pytest.raises(ValueError, match="Template with ID nonexistent-id not found"):
                    create_temporary_sample_template(template_id="nonexistent-id", current_user_id="user-123")

    @patch("app.sample_template_utils.template_category_api_client.get_all_template_categories")
    def test_create_temporary_sample_template_sets_timestamps(self, mock_get_categories, mock_template_categories, app_):
        """Test that create_temporary_sample_template sets proper timestamps."""
        mock_get_categories.return_value = mock_template_categories

        template_data = {
            "id": "test-id",
            "template_name": {"en": "Test", "fr": "Test FR"},
            "template_category": "authentication",
            "subject": "Test Subject",
            "example_content": "Test content",
            "notification_type": "email",
        }

        with patch("app.sample_template_utils.get_sample_template_by_id", return_value=template_data):
            with app_.app_context():
                with patch("app.sample_template_utils.datetime") as mock_datetime:
                    mock_now = datetime(2023, 1, 1, 12, 0, 0)
                    mock_datetime.utcnow.return_value = mock_now

                    result = create_temporary_sample_template(template_id="test-id", current_user_id="user-123")

                    expected_timestamp = "2023-01-01T12:00:00"
                    assert result["created_at"] == expected_timestamp
                    assert result["updated_at"] == expected_timestamp

    @pytest.mark.parametrize(
        "preview, expected_subject",
        [
            (True, "Example Subject with Personalization"),
            (False, "Regular Subject"),
        ],
    )
    @patch("app.sample_template_utils.template_category_api_client.get_all_template_categories")
    def test_create_temporary_sample_template_preview_parameter(
        self, mock_get_categories, preview, expected_subject, mock_template_categories, app_
    ):
        """Test create_temporary_sample_template uses correct subject based on preview parameter."""
        mock_get_categories.return_value = mock_template_categories
        current_user_id = "user-123"

        template_data = {
            "id": "test-id",
            "template_name": {"en": "Test Template", "fr": "Gabarit de test"},
            "template_category": "authentication",
            "subject": "Regular Subject",
            "example_subject": "Example Subject with Personalization",
            "content": "Regular content",
            "example_content": "Example content with personalization",
            "notification_type": "email",
        }

        with patch("app.sample_template_utils.get_sample_template_by_id", return_value=template_data):
            with app_.app_context():
                result = create_temporary_sample_template(template_id="test-id", current_user_id=current_user_id, preview=preview)

                # Subject should match expectation based on preview parameter
                assert result["subject"] == expected_subject
                assert result["content"] == "Example content with personalization"

                # Other fields should remain the same
                assert result["id"] == "test-id"
                assert result["name"] == "Test Template"
                assert result["name_fr"] == "Gabarit de test"
                assert result["template_type"] == "email"
                assert result["created_by"] == current_user_id
