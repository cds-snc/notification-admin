import os
from typing import Any, Dict, List, Optional

import yaml  # type: ignore
from flask import current_app

from app.extensions import cache


@cache.memoize(timeout=24 * 60 * 60)  # Cache for 24 hours
def get_sample_templates() -> List[Dict[str, Any]]:
    """
    Get all sample templates from cache or load from YAML files.

    Returns:
        List[Dict[str, Any]]: List of all sample template data dictionaries,
        sorted by template name in English.
    """
    return _load_sample_templates_from_files()


@cache.memoize(timeout=24 * 60 * 60)  # Cache for 24 hours
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


@cache.memoize(timeout=24 * 60 * 60)  # Cache for 24 hours
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
