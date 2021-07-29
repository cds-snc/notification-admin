import csv
import sys
import re

extra_keys_in_app = set(
    [
        "English Government of Canada signature",  # constant
        "French Government of Canada signature",  # constant
        "Empty",  # template_list.py
        "1 template",  # template_list.py
        "Not a valid phone number",  # a validation liberary
        "bad invitation link",  # api
        "invitation expired",  # api
        "password",  # api
        "Your service already uses ",  # api
        "Code not found",  # api
        "Code already sent, wait 10 seconds",  # api
        "You cannot delete a default email reply to address",  # api
        "Code has expired",  # api
        "Code already sent",  # api
        "Code has already been used",  # api
        "as an email reply-to address.",  # api
        "You cannot remove the only user for a service",  # api
        "Cannot send to international mobile numbers",  # api
    ]
)

keys_wrongly_detected = set(["header", "Send {}", "Not a valid phone number"])


def csv_to_dict(filename):
    d = dict()
    with open(filename, newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        for index, row in enumerate(reader):
            d[row["source"]] = row.get("location", f"{filename}:{index+1}")
    return d


def printMissingKeys(name, keys, app):
    for k in keys:
        print(f'{name} : {app[k]} : "{k}"')  # noqa: T001


def malformed_rows(filename):
    malformed_rows_found = False
    with open(filename, newline="") as file:
        extra_space_pattern = re.compile(r'".*"(\s*,\s+|\s+,\s*)".*"')  # at least one space on at least one side of the comma
        for index, row in enumerate(file.readlines()):
            if extra_space_pattern.match(row):
                print(f"Extra space : {filename}:{index+1} : {row}", end="")  # noqa: T001
                malformed_rows_found = True
    return malformed_rows_found


def duplicate_keys(filename):
    keys = set()
    duplicates_found = False
    with open(filename, newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        for index, row in enumerate(reader):
            key = row["source"]
            if key in keys:
                print(f"Duplicate: {filename}:{index+2} : {key}")  # noqa: T001
                duplicates_found = True
            keys.add(key)
    return duplicates_found


if __name__ == "__main__":
    fr_csv_filename = "app/translations/csv/fr.csv"

    app = csv_to_dict(sys.argv[1])
    csv_fr = csv_to_dict(fr_csv_filename)

    app_keys = set(app.keys()).union(extra_keys_in_app).difference(keys_wrongly_detected)
    csv_fr_keys = set(csv_fr.keys())

    in_app_not_in_fr_csv = app_keys.difference(csv_fr_keys)
    in_fr_csv_not_in_app = csv_fr_keys.difference(app_keys)

    printMissingKeys("missing from fr.csv", in_app_not_in_fr_csv, app)
    # printMissingKeys("unused translations (check api before deleting!)", in_fr_csv_not_in_app)

    has_keys_missing = len(in_app_not_in_fr_csv) > 0
    has_malformed_rows = malformed_rows(fr_csv_filename)
    has_duplicate_keys = duplicate_keys(fr_csv_filename)

    if has_malformed_rows or has_duplicate_keys or has_keys_missing:
        exit(1)
    else:
        print("\nNo problems detected in fr.csv\n")  # noqa: T001
