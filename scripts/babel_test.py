import csv
import sys

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


def csv_to_dict(filename):
    d = dict()
    with open(filename, newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            d[row["source"]] = row["target"]
    return d


def printMissingKeys(name, keys):
    if keys:
        print("\n----- " + name)  # noqa: T001
        for k in keys:
            print(k)  # noqa: T001


app = csv_to_dict(sys.argv[1])
csv_en = csv_to_dict("app/translations/csv/en.csv")
csv_fr = csv_to_dict("app/translations/csv/fr.csv")

app_keys = set(app.keys()).union(extra_keys_in_app)
csv_en_keys = set(csv_en.keys())
csv_fr_keys = set(csv_fr.keys())

in_one_csv_not_both = csv_en_keys.symmetric_difference(csv_fr_keys)

in_app_not_in_en_csv = app_keys.difference(csv_en_keys)
in_app_not_in_fr_csv = app_keys.difference(csv_fr_keys)
missing_from_csvs = in_app_not_in_en_csv.union(in_app_not_in_fr_csv)

in_en_csv_not_in_app = csv_en_keys.difference(app_keys)
in_fr_csv_not_in_app = csv_fr_keys.difference(app_keys)
unused_translations = in_en_csv_not_in_app.union(in_fr_csv_not_in_app)

printMissingKeys("missing from csvs", missing_from_csvs)
printMissingKeys("in one csv but not both", in_one_csv_not_both)
printMissingKeys(
    "unused translations (check api before deleting!)", unused_translations
)
print(" ")  # noqa: T001
