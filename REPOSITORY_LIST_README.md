# Repository List Documentation

This directory contains documentation about repositories in the `cds-snc` organization that have the `export_github_data.yml` workflow enabled.

## Files

### MATCHED_REPOSITORIES.md
A human-readable markdown file containing:
- Overview of the workflow and its purpose
- List of matched repositories with links and descriptions
- Instructions on how to get the complete list

**Use this file when:** You need a quick reference or want to share the list in a readable format.

### matched_repositories.json
A machine-readable JSON file containing:
- Structured data for programmatic access
- Repository metadata (name, description, URL, etc.)
- Generation date and total count

**Use this file when:** You need to process the data programmatically or integrate it with other tools.

### matched_repositories.csv
A spreadsheet-compatible CSV file containing:
- Tab-separated repository information
- Easy to import into Excel, Google Sheets, or other spreadsheet applications

**Use this file when:** You need to analyze or filter the data in a spreadsheet.

## What is export_github_data.yml?

The `export_github_data.yml` workflow is used across multiple CDS repositories to:
- Collect repository metadata automatically
- Export data to Azure Sentinel for security monitoring
- Upload data to S3 for data lake analytics
- Track repository health and compliance

The workflow uses the [github-repository-metadata-exporter](https://github.com/cds-snc/github-repository-metadata-exporter) action.

## Getting the Complete List

The files in this directory show 31 out of 78 total repositories. To get the complete list:

1. Use the GitHub Code Search API:
   ```
   org:cds-snc filename:export_github_data.yml
   ```

2. Or use the GitHub CLI:
   ```bash
   gh search code --owner cds-snc "filename:export_github_data.yml"
   ```

## Last Updated

2025-11-27
