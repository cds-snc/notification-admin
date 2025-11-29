# Repositories with export_github_data.yml Workflow

This document lists all repositories in the `cds-snc` organization that have the `export_github_data.yml` workflow enabled.

## Total Count
**78 repositories** have this workflow configured.

## Repository List

1. [gcds-components](https://github.com/cds-snc/gcds-components) - GC Design System Components is a monorepo managing the web components of the GC Design System.
2. [terraform-plan](https://github.com/cds-snc/terraform-plan) - GitHub Action to run Terraform plan and add a comment with the changes.
3. [cds-website-terraform](https://github.com/cds-snc/cds-website-terraform) - Terraform for Website infrastructure (Strapi)
4. [gc-notification-github-action](https://github.com/cds-snc/gc-notification-github-action) - Sends messages from a GitHub action using GC Notify (or any other Notify fork)
5. [site-reliability-engineering-public](https://github.com/cds-snc/site-reliability-engineering-public) - Public releases of CDS site reliability engineering practices
6. [simplify-privacy-statements-V2](https://github.com/cds-snc/simplify-privacy-statements-V2) - starter-app repo based version of privacy app.
7. [terraform-tools-setup](https://github.com/cds-snc/terraform-tools-setup) - GitHub action to install all the required Terraform tooling needed at CDS
8. [terraform-demo](https://github.com/cds-snc/terraform-demo) - Terraform 101 Workshop Docs + Boilerplate
9. [gcds-examples](https://github.com/cds-snc/gcds-examples) - GC Design System repository containing code examples
10. [threat-modeling-tool](https://github.com/cds-snc/threat-modeling-tool) - CDS Threat Modeling Tool MVP
11. [gc-simple-dictionary](https://github.com/cds-snc/gc-simple-dictionary) - A simple web page with an autocomplete feature to lookup all the acronyms you can stumble on at the Government of Canada
12. [ipv4-geolocate-webservice](https://github.com/cds-snc/ipv4-geolocate-webservice) - The purpose of this webservice is to translate IP v4 (ex. 23.233.63.149) into a geographic location.
13. [smtp-proxy-for-notify](https://github.com/cds-snc/smtp-proxy-for-notify) - SMTP proxy for Notify
14. [sentinel-forward-data-action](https://github.com/cds-snc/sentinel-forward-data-action) - A github action that forwards data from a previous action to Sentinel
15. [notification-api](https://github.com/cds-snc/notification-api) - GC Notify API | GC Notification API
16. [terraform-modules](https://github.com/cds-snc/terraform-modules) - Terraform modules for AWS
17. [dns](https://github.com/cds-snc/dns) - DNS Configuration for domains managed by CDS
18. [secret](https://github.com/cds-snc/secret) - Share Secrets securely
19. [forms-terraform](https://github.com/cds-snc/forms-terraform) - Infrastructure as Code for the GC Forms environment
20. [gcds-docs](https://github.com/cds-snc/gcds-docs) - GC Design System Docs is a documentation website for GC Design System.
21. [gcds-tokens](https://github.com/cds-snc/gcds-tokens) - GC Design System Tokens are the smallest building blocks of GC Design System
22. [github-secret-scanning](https://github.com/cds-snc/github-secret-scanning) - GitHub secret scanning alert service
23. [gcds-css-shortcuts](https://github.com/cds-snc/gcds-css-shortcuts) - GC Design System CSS Shortcuts is a CSS utility framework built to match GC Design System (GCDS) styles
24. [security-tools](https://github.com/cds-snc/security-tools) - This repository will contain various tools used by CDS to ensure the confidentiality, integrity and availability of CDS applications and services
25. [gc-organisations](https://github.com/cds-snc/gc-organisations) - An exported list of Government of Canada departments, agencies, crown corporations and provincial governments
26. [scan-files](https://github.com/cds-snc/scan-files) - File scanning for CDS Platform products
27. [cds-superset](https://github.com/cds-snc/cds-superset) - AWS infrastructure and custom config used to run CDS's instance of Superset.
28. [forms-api](https://github.com/cds-snc/forms-api) - GC Forms API
29. [data-lake](https://github.com/cds-snc/data-lake) - Infrastructure for the Platform Data Lake
30. [github-repository-metadata-exporter](https://github.com/cds-snc/github-repository-metadata-exporter) - 📯 Exports GitHub repository metadata
31. [notification-admin](https://github.com/cds-snc/notification-admin) - GC Notify Admin | GC Notification Admin

*Note: This list was generated on 2025-11-27 and includes the first 31 repositories from the search results. The total count shows 78 repositories have this workflow.*

## About the Workflow

The `export_github_data.yml` workflow uses the [github-repository-metadata-exporter](https://github.com/cds-snc/github-repository-metadata-exporter) action to collect and export repository metadata to Azure Sentinel and S3 for data analytics and monitoring purposes.

The workflow collects:
- Repository information
- Branch protection settings
- Code scanning alerts
- Dependabot alerts
- Commit counts
- Required files
- Action dependencies
- Renovate PRs
- And more...
