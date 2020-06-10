import csv
import os
import subprocess
from pprint import pprint


def csv_to_dict(filename):
    d = {}
    with open(filename, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            d[row['source']] = row['target']
    return d


subprocess.run(['pybabel', 'extract', '-F', 'babel.cfg', '-k', '_l', '-o', '/tmp/messages.po', '.'])
subprocess.run(['po2csv', '/tmp/messages.po', '/tmp/messages.csv'])
os.remove('/tmp/messages.po')

extract = csv_to_dict('/tmp/messages.csv')
os.remove('/tmp/messages.csv')
existing_en = csv_to_dict('app/translations/csv/en.csv')
existing_fr = csv_to_dict('app/translations/csv/fr.csv')

extract_keys = set(extract.keys())
existing_en_keys = set(existing_en.keys())
existing_fr_keys = set(existing_fr.keys())

in_en_csv_not_in_app = existing_en_keys.difference(extract_keys)
in_fr_csv_not_in_app = existing_fr_keys.difference(extract_keys)

in_app_not_in_en_csv = extract_keys.difference(existing_en_keys)
in_app_not_in_fr_csv = extract_keys.difference(existing_fr_keys)

print('\nin_en_csv_not_in_app:')  # noqa: T001
pprint(in_en_csv_not_in_app)  # noqa: T003

print('\nin_fr_csv_not_in_app:')  # noqa: T001
pprint(in_fr_csv_not_in_app)  # noqa: T003

print('\nin_app_not_in_en_csv:')  # noqa: T001
pprint(in_app_not_in_en_csv)  # noqa: T003

print('\nin_app_not_in_fr_csv:')  # noqa: T001
pprint(in_app_not_in_fr_csv)  # noqa: T003
