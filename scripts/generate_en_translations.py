import csv
from pathlib import Path

root_folder = Path(__file__).parent.parent.absolute()
translation_folder = "app/translations/csv"

fr_file = root_folder / translation_folder / "fr.csv"
en_base_file = root_folder / translation_folder / "en_base.csv"
en_file = root_folder / translation_folder / "en.csv"

headers = ["source", "target"]

with open(fr_file) as fr, open(en_base_file) as en_base, open(en_file, "w") as en:
    reader = csv.DictReader(fr, fieldnames=headers)
    base_en_reader = csv.DictReader(en_base, fieldnames=headers)

    # Write a few English overrides
    en_writer = csv.DictWriter(en, fieldnames=headers, quoting=csv.QUOTE_ALL)
    translated = set()
    for row in base_en_reader:
        en_writer.writerow({"source": row["source"], "target": row["target"]})
        translated.add(row["source"])

    # Fill up the en.csv file with empty strings based on the fr.csv file
    for row in reader:
        if row["source"] not in translated:
            en_writer.writerow({"source": row["source"], "target": ""})
