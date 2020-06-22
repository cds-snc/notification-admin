import csv
import os

# input keywords here, lowercase
keywords = []
# example
# keywords = ["can't","can’t","cannot","can not"]


def search_single_file(filename):
    d = []
    with open(filename, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            for keyword in keywords:
                # lower case everything to make matches easier to find
                if keyword in row['source'].lower() or keyword in row['target'].lower():
                    # append the translated string
                    d.append({"keyword": keyword, "found_string": row['source'] if row['target'] == '' else row['target']})
                    continue
    return d


def search_translation_strings():
    cwd = os.getcwd()

    d = []

    # english
    d = d + search_single_file(cwd + "/app/translations/csv/en.csv")

    # french
    d = d + search_single_file(cwd + "/app/translations/csv/fr.csv")

    # write results
    with open(cwd + '/scripts/searchresults.csv', 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["keyword", "found_string"])
        writer.writeheader()
        for row in d:
            writer.writerow({"keyword": row["keyword"], "found_string": row["found_string"]})


search_translation_strings()
