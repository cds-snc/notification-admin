import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import yaml  # type: ignore
from flask import current_app

from app.extensions import cache
from app.notify_client.template_category_api_client import template_category_api_client


@cache.memoize(timeout=0)  # Cache indefinitely - until the app restarts
def get_sample_templates() -> List[Dict[str, Any]]:
    """
    Get all sample templates from cache or load from YAML files.

    Returns:
        List[Dict[str, Any]]: List of all sample template data dictionaries,
        sorted by template name in English.
    """
    return _load_sample_templates_from_files()


@cache.memoize(timeout=0)  # Cache indefinitely - until the app restarts
def get_sample_template_by_id(template_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific sample template by ID from cache.

    Args:
        template_id: The ID of the template to retrieve

    Returns:
        Optional[Dict[str, Any]]: Template data dictionary if found, None otherwise
    """
    templates = get_sample_templates()
    for template in templates:
        if template.get("id") == template_id:
            return template
    return None


@cache.memoize(timeout=0)  # Cache indefinitely - until the app restarts
def get_sample_templates_by_type(notification_type: str) -> List[Dict[str, Any]]:
    templates = get_sample_templates()
    return [template for template in templates if template.get("notification_type") == notification_type]


def _load_sample_templates_from_files() -> List[Dict[str, Any]]:
    """
    Read and parse all YAML files from the sample_templates folder.
    This is the internal function that does the actual file loading.

    Returns:
        List[Dict[str, Any]]: List of sample template data dictionaries,
        sorted by template name in English.
    """
    # Read and parse all YAML files from the sample_templates folder
    sample_templates_folder = os.path.join(current_app.root_path, "sample_templates")
    sample_templates = []

    try:
        # Get all YAML files in the sample_templates directory
        for filename in os.listdir(sample_templates_folder):
            if filename.endswith((".yaml", ".yml")) and not filename.startswith("."):
                file_path = os.path.join(sample_templates_folder, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as file:
                        template_data = yaml.safe_load(file)
                        if template_data:  # Only add if file contains valid data
                            template_data["filename"] = filename
                            sample_templates.append(template_data)
                except (yaml.YAMLError, IOError) as e:
                    current_app.logger.warning(f"Error reading sample template {filename}: {e}")
                    continue
    except OSError as e:
        current_app.logger.error(f"Error accessing sample_templates folder: {e}")
        sample_templates = []

    # Sort templates by pinned status first (pinned templates at top), then by name for consistent ordering
    sample_templates.sort(key=lambda x: (not x.get("pinned", False), x.get("template_name", {}).get("en", "")))

    return sample_templates


def clear_sample_template_cache():
    """
    Clear all cached sample template data.
    Useful for testing or when template files are updated.
    """
    cache.delete_memoized(get_sample_templates)
    cache.delete_memoized(get_sample_template_by_id)
    cache.delete_memoized(get_sample_templates_by_type)


def create_temporary_sample_template(template_id: str, current_user_id) -> Dict[str, Any]:
    """
    Create a temporary Template object from sample template data.

    Args:
        template_id: The UUID of the template to load

    Returns:
        Template object or None if template not found
    """
    template_data = get_sample_template_by_id(template_id)
    if not template_data:
        raise ValueError(f"Template with ID {template_id} not found")
    template_categories = template_category_api_client.get_all_template_categories()
    new_template_data = {}
    for category in template_categories:
        if category["name_en"].lower() == template_data.get("template_category", "").lower():
            new_template_data["template_category_id"] = category["id"]
            new_template_data["template_category"] = category
            break
        if category["name_fr"].lower() == template_data.get("template_category", "").lower():
            new_template_data["template_category_id"] = category["id"]
            new_template_data["template_category"] = category
            break
    new_template_data["id"] = template_data.get("id", None)
    # TODO: how are we displaying this?
    new_template_data["name"] = template_data.get("template_name", {}).get("en", "")
    new_template_data["name_fr"] = template_data.get("template_name", {}).get("fr", "")
    new_template_data["content"] = template_data.get("example_content", "")
    new_template_data["subject"] = template_data.get("example_subject", "")
    new_template_data["template_type"] = template_data.get("notification_type", None)

    new_template_data["created_at"] = datetime.utcnow().isoformat()
    new_template_data["updated_at"] = datetime.utcnow().isoformat()
    new_template_data["archived"] = False
    new_template_data["version"] = 1
    new_template_data["created_by"] = current_user_id
    new_template_data["postage"] = None
    new_template_data["folder"] = None
    new_template_data["reply_to_text"] = None
    new_template_data["reply_to_email_address"] = None
    new_template_data["instruction_content"] = template_data.get("content", "")
    new_template_data["text_direction_rtl"] = template_data.get("text_direction_rtl", False)

    return new_template_data
