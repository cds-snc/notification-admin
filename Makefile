.DEFAULT_GOAL := help
SHELL := /bin/bash #bash | sh
DATE = $(shell date +%Y-%m-%dT%H:%M:%S)

PIP_ACCEL_CACHE ?= ${CURDIR}/cache/pip-accel
APP_VERSION_FILE = app/version.py

GIT_BRANCH ?= $(shell git symbolic-ref --short HEAD 2> /dev/null || echo "detached")
GIT_COMMIT ?= $(shell git rev-parse HEAD 2> /dev/null || echo "")
AWS_PROFILE ?= notify-staging
AWS_CLI ?= /usr/local/bin/aws


.PHONY: help
help:
	@cat $(MAKEFILE_LIST) | grep -E '^[a-zA-Z_-]+:.*?## .*$$' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: generate-version-file
generate-version-file: ## Generates the app version file
	printf "__commit_sha__ = \"${GIT_COMMIT}\"\n__time__ = \"${DATE}\"\n" > ${APP_VERSION_FILE}

.PHONY: test
test:
	poetry run ./scripts/run_tests.sh

.PHONY: babel-test
test-translations: babel
	poetry run pybabel extract -F babel.cfg -k _l -o /tmp/messages.po . && poetry run po2csv /tmp/messages.po /tmp/messages.csv
	rm /tmp/messages.po
	python scripts/test-translations.py /tmp/messages.csv
	rm /tmp/messages.csv

.PHONY: babel
babel:
	python scripts/generate_en_translations.py
	poetry run csv2po app/translations/csv/en.csv app/translations/en/LC_MESSAGES/messages.po
	poetry run csv2po app/translations/csv/fr.csv app/translations/fr/LC_MESSAGES/messages.po
	poetry run pybabel compile -d app/translations

.PHONY: search-csv
search-csv:
	python scripts/search_csv.py

.PHONY: freeze-requirements
freeze-requirements:
	poetry lock --no-update

.PHONY: test-requirements
test-requirements:
	poetry check --lock

.PHONY: coverage
coverage: venv ## Create coverage report
	. venv/bin/activate && coveralls

.PHONY: run-dev
run-dev: aws-login
	@npm run watch & WATCH_PID=$$!; \
	trap 'kill $$WATCH_PID 2>/dev/null || true' EXIT INT TERM; \
	AWS_PROFILE="$(AWS_PROFILE)" FLASK_DEBUG=1 poetry run python -m debugpy --listen localhost:5678 -m flask run -p 6012 --host=0.0.0.0

.PHONY: aws-login
aws-login: ## Log in to AWS SSO for local staging development
	@test -x "$(AWS_CLI)" || (echo "AWS CLI v2 is required; rebuild the dev container"; exit 1)
	@"$(AWS_CLI)" --version 2>&1 | grep -q 'aws-cli/2\.' || (echo "AWS CLI v2 is required; rebuild the dev container"; exit 1)
	@if identity_output=$$("$(AWS_CLI)" sts get-caller-identity --profile "$(AWS_PROFILE)" 2>&1); then \
		echo "AWS SSO session already active for $(AWS_PROFILE)"; \
	else \
		printf '%s\n' "$$identity_output"; \
		echo "AWS SSO session missing or expired; starting login"; \
		"$(AWS_CLI)" sso login --profile "$(AWS_PROFILE)"; \
	fi

.PHONY: watch
watch:
	npm run watch

.PHONY: run-gunicorn
run-gunicorn: aws-login
	AWS_PROFILE="$(AWS_PROFILE)" PORT=6012 poetry run gunicorn -c gunicorn_config.py application

.PHONY: format
format:
	poetry run ruff check --fix .
	poetry run ruff check
	poetry run ruff format .
	poetry run mypy ./
	npx prettier --write app/assets/javascripts app/assets/stylesheets tests_cypress/cypress/e2e

.PHONY: tailwind
tailwind:
	npm run tailwind