import csv
from pathlib import Path

root_folder = Path(__file__).parent.parent.absolute()
translation_folder = "app/translations/csv"

fr_file = root_folder / translation_folder / "fr.csv"
en_file = root_folder / translation_folder / "en.csv"

headers = ["source", "target"]

with open(fr_file) as fr, open(en_file, "w") as en:
    reader = csv.DictReader(fr, fieldnames=headers)
    writer = csv.DictWriter(en, fieldnames=headers, quoting=csv.QUOTE_ALL)

    for row in reader:
        writer.writerow({"source": row["source"], "target": ""})
