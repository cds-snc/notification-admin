import csv
import sys

extra_keys_in_app = set([
    'Empty',  # template_list.py
    '1 template',  # template_list.py
    'Not a valid international number',  # a validation liberary
    'bad invitation link',  # api
    'invitation expired',  # api
    'password',  # api
])


def csv_to_dict(filename):
    d = dict()
    with open(filename, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            d[row['source']] = row['target']
    return d


def printMissingKeys(name, keys):
    print('\n' + name)
    for k in keys:
        print(k)  # noqa: T001


extract = csv_to_dict(sys.argv[1])
existing_en = csv_to_dict('app/translations/csv/en.csv')
existing_fr = csv_to_dict('app/translations/csv/fr.csv')

extract_keys = set(extract.keys()).union(extra_keys_in_app)
existing_en_keys = set(existing_en.keys())
existing_fr_keys = set(existing_fr.keys())

in_app_not_in_en_csv = extract_keys.difference(existing_en_keys)
in_app_not_in_fr_csv = extract_keys.difference(existing_fr_keys)

in_en_csv_not_in_app = existing_en_keys.difference(extract_keys)
in_fr_csv_not_in_app = existing_fr_keys.difference(extract_keys)
unused_translations = in_en_csv_not_in_app.union(in_fr_csv_not_in_app)

printMissingKeys('not in en.csv', in_app_not_in_en_csv)
printMissingKeys('not in fr.csv', in_app_not_in_fr_csv)
printMissingKeys('unused translations', unused_translations)
