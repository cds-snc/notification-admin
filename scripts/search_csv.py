import csv
import os


def search_single_file(filename, keywords):
    d = []
    with open(filename, newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            for keyword in keywords:
                # lower case everything to make matches easier to find
                if keyword in row["source"].lower() or keyword in row["target"].lower():
                    # append the translated string if it exists
                    d.append(
                        {
                            "keyword": keyword,
                            "found_string": row["source"] if row["target"] == "" else row["target"],
                        }
                    )
                    continue
    return d


def search_translation_strings(search_terms: str):
    keywords = [x.strip() for x in search_terms.split(",")]
    cwd = os.getcwd()

    d: list = []

    # english
    d = d + search_single_file(cwd + "/app/translations/csv/en.csv", keywords)

    # french
    d = d + search_single_file(cwd + "/app/translations/csv/fr.csv", keywords)

    # write results
    with open(cwd + "/scripts/searchresults.csv", "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["keyword", "found_string"])
        writer.writeheader()
        for row in d:
            writer.writerow({"keyword": row["keyword"], "found_string": row["found_string"]})
