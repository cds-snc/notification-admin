cat app/version.py

# make test-requirements
display_result $? 1 "Requirements check"

flake8 .
display_result $? 1 "Code style check"

isort --check-only -rc ./app ./tests
display_result $? 2 "Import order check"

npm test
display_result $? 3 "Front end code style check"

## Code coverage
py.test -n8 --maxfail=10 tests/ --strict -p no:warnings
display_result $? 4 "Code coverage"
