import os
from typing import Any, Dict, List

import yaml
from flask import current_app


def get_sample_templates() -> List[Dict[str, Any]]:
    """
    Read and parse all YAML files from the sample_templates folder.

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

    # Sort templates by name for consistent ordering
    sample_templates.sort(key=lambda x: x.get("template_name", {}).get("en", ""))

    return sample_templates
