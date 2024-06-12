## Event-Workflow Map

<table>
<tr>
<th rowspan=2><code>schedule</code></th><th><code> At 04:00 AM </code></th><th><code> At 12:00 AM </code></th><th><code> At 11:18 PM, only on Friday </code></th><th><code> At 0 minutes past the hour, every 3 hours </code></th><th><code> At 07:20 AM </code></th><th><code> At 01:30 AM, only on Saturday </code></th><th><code> At 06:00 AM </code></th><th><code>At 1 minutes past the hour, only on Sunday and Saturday</code>, <code>At 1 minutes past the hour, at 12:00 AM through 12:59 PM and 08:00 PM through 11:59 PM, Monday through Friday</code></th></tr>
<tr><td><ul><li><a href='#docker-vulnerability-scan'>Docker vulnerability scan</a></li><li><a href='#delete-unused-pr-review-environments'>Delete unused PR review environments</a></li></ul><td><ul><li><a href='#backstage-catalog-info-helper'>Backstage Catalog Info Helper</a></li></ul><td><ul><li><a href='#codeql'>CodeQL</a></li></ul><td><ul><li><a href='#cypress-staging-a11y-tests'>Cypress staging a11y tests</a></li></ul><td><ul><li><a href='#github-repository-metadata-exporter'>GitHub repository metadata exporter</a></li></ul><td><ul><li><a href='#scorecards-supply-chain-security'>Scorecards supply-chain security</a></li></ul><td><ul><li><a href='#s3-backup'>S3 backup</a></li></ul><td><ul><li><a href='#continuous-integration-testing'>Continuous Integration Testing</a></li></ul></tr><tr>
<th rowspan=2><code>pull_ request</code></th><th><code> any </code></th><th><code>synchronize</code>, <code>reopened</code>, <code>opened</code>, <code>labeled</code></th><th><code> closed </code></th></tr>
<tr><td><ul><li><a href='#codeql'>CodeQL</a></li><li><a href='#build,-push-to-aws-ecr,-and-deploy'>Build, push to AWS ECR, and deploy</a></li></ul><td><ul><li><a href='#deploy-test-admin-environment'>Deploy test admin environment</a></li></ul><td><ul><li><a href='#remove-test-admin-deployment'>Remove test admin deployment</a></li></ul></tr><tr>
<th rowspan=2><code>push</code></th><th><code> main </code></th><th><code> any </code></th></tr>
<tr><td><ul><li><a href='#codeql'>CodeQL</a></li><li><a href='#build,-push-to-aws-ecr,-and-deploy'>Build, push to AWS ECR, and deploy</a></li><li><a href='#scorecards-supply-chain-security'>Scorecards supply-chain security</a></li></ul><td><ul><li><a href='#continuous-integration'>Continuous Integration</a></li><li><a href='#continuous-integration-testing'>Continuous Integration Testing</a></li><li><a href='#test-endpoints'>test endpoints</a></li></ul></tr><tr>
<th rowspan=2><code>workflow_ dispatch</code></th><th><code> any </code></th></tr>
<tr><td><ul><li><a href='#backstage-catalog-info-helper'>Backstage Catalog Info Helper</a></li><li><a href='#docker-vulnerability-scan'>Docker vulnerability scan</a></li><li><a href='#github-repository-metadata-exporter'>GitHub repository metadata exporter</a></li><li><a href='#build,-push-to-aws-ecr,-and-deploy'>Build, push to AWS ECR, and deploy</a></li><li><a href='#scorecards-supply-chain-security'>Scorecards supply-chain security</a></li><li><a href='#s3-backup'>S3 backup</a></li><li><a href='#delete-unused-pr-review-environments'>Delete unused PR review environments</a></li></ul></tr></table>

## Workflows 

 | Workflow | Description | 
 | --- | --- | 
| <a href="/.github/workflows/docker-vulnerability-scan.yml" id="docker-vulnerability-scan">Docker vulnerability scan</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/test-admin-delete-unused.yaml" id="delete-unused-pr-review-environments">Delete unused PR review environments</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/backstage-catalog-helper.yml" id="backstage-catalog-info-helper">Backstage Catalog Info Helper</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/codeql.yml" id="codeql">CodeQL</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/cypress-staging.yaml" id="cypress-staging-a11y-tests">Cypress staging a11y tests</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/export_github_data.yml" id="github-repository-metadata-exporter">GitHub repository metadata exporter</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/ossf-scorecard.yml" id="scorecards-supply-chain-security">Scorecards supply-chain security</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/s3-backup.yml" id="s3-backup">S3 backup</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/test.yaml" id="continuous-integration-testing">Continuous Integration Testing</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/generate-workflow-map.yaml" id="build,-push-to-aws-ecr,-and-deploy">Build, push to AWS ECR, and deploy</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/test-admin-deploy.yaml" id="deploy-test-admin-environment">Deploy test admin environment</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/test-admin-remove.yaml" id="remove-test-admin-deployment">Remove test admin deployment</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/docker.yaml" id="build,-push-to-aws-ecr,-and-deploy">Build, push to AWS ECR, and deploy</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/secret.yaml" id="continuous-integration">Continuous Integration</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
| <a href="/.github/workflows/test_endpoints.yaml" id="test-endpoints">test endpoints</a> | Your first comment after <code>name</code> parameter in workflow will appear here. |
