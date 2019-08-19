workflow "Continuous Integration" {
  on = "push"
  resolves = ["docker://cdssnc/seekret-github-action", "docker://cdssnc/a11y-multiple-page-checker"]
}

action "docker://cdssnc/seekret-github-action" {
  uses = "docker://cdssnc/seekret-github-action"
}

action "docker://cdssnc/a11y-multiple-page-checker" {
  uses = "docker://cdssnc/a11y-multiple-page-checker"
}