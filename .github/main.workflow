workflow "Continuous Integration" {
  on = "push"
  resolves = ["docker://cdssnc/seekret-github-action"]
}

action "docker://cdssnc/seekret-github-action" {
  uses = "docker://cdssnc/seekret-github-action"
}

workflow "a11y scan" {
  on = "deployment_status"
  resolves = ["docker://cdssnc/a11y-multiple-page-checker-1"]
}

action "docker://cdssnc/a11y-multiple-page-checker-1" {
  uses = "docker://cdssnc/a11y-multiple-page-checker"
}
