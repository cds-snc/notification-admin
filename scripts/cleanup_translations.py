import csv
import os
import subprocess
import sys
import tempfile

try:
    from scripts.test_translations import extra_keys_in_app
except ImportError:
    from test_translations import extra_keys_in_app


def get_translation_keys(csv_path):
    keys = set()
    if not os.path.exists(csv_path):
        return keys

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["source"]:
                if row["source"].startswith("!/!/"):
                    continue
                keys.add(row["source"])
    return keys


def get_keys_from_babel():
    """Extract keys using the project's Babel configuration."""
    print("Extracting strings via Babel (this matches how 'make test-translations' works)...")
    messages_po = None
    messages_csv = None
    try:
        # Create unique temp files
        with tempfile.NamedTemporaryFile(suffix=".po", delete=False) as po_file:
            messages_po = po_file.name
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as csv_file:
            messages_csv = csv_file.name

        # 1. Run pybabel extract
        subprocess.run(
            ["poetry", "run", "pybabel", "extract", "-F", "babel.cfg", "-k", "_l", "-o", messages_po, "."],
            check=True,
            capture_output=True,
        )

        # 2. Run po2csv
        subprocess.run(["poetry", "run", "po2csv", messages_po, messages_csv], check=True, capture_output=True)

        # 3. Read extracted keys
        extracted_keys = set()
        with open(messages_csv, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                extracted_keys.add(row["source"])

        return extracted_keys
    except Exception as e:
        print(f"Error extracting via Babel: {e}")
        raise
    finally:
        # Resource cleanup in finally block to prevent file leaks
        for temp_file in [messages_po, messages_csv]:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass


def find_unused_translations(keys, search_dirs):
    # First, get keys that are used in code via Babel (covers Python/HTML)
    babel_keys = get_keys_from_babel()

    # Also need to consider hardcoded constant keys used in test_translations.py
    extra_keys = extra_keys_in_app

    # We also need to search for JS and CSS keys which Babel might miss
    # if they aren't marked with _().
    unused = set(keys) - babel_keys - extra_keys

    # Second pass: search remaining unused keys in JS and CSS files efficiently
    for directory in search_dirs:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith((".js", ".css", ".scss", ".txt", ".md")):
                    file_path = os.path.join(root, file)
                    if "translations/csv" in file_path or "node_modules" in file_path:
                        continue
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()

                            # Optimization: only check keys that are still in 'unused'
                            # Use list(unused) to avoid "Set size changed during iteration"
                            for key in list(unused):
                                if key in content:
                                    unused.remove(key)

                            if not unused:
                                return unused
                    except Exception:
                        pass

    return unused


def delete_unused_translations(csv_path, unused_keys):
    temp_path = csv_path + ".tmp"
    with open(csv_path, mode="r", encoding="utf-8") as f_in, open(temp_path, mode="w", encoding="utf-8", newline="") as f_out:
        reader = csv.DictReader(f_in)
        writer = csv.DictWriter(f_out, fieldnames=reader.fieldnames)
        writer.writeheader()

        count = 0
        for row in reader:
            if row["source"] in unused_keys:
                count += 1
                continue
            writer.writerow(row)

    os.replace(temp_path, csv_path)
    return count


if __name__ == "__main__":
    csv_path = "app/translations/csv/fr.csv"
    search_dirs = ["app", "scripts"]

    if len(sys.argv) > 1:
        if sys.argv[1] in ["--help", "-h"]:
            print(f"Usage: python {sys.argv[0]} [path_to_csv]")
            sys.exit(0)
        csv_path = sys.argv[1]

    print(f"Loading translations from {csv_path}...")
    keys = get_translation_keys(csv_path)
    print(f"Found {len(keys)} unique translation source strings.")

    print("Searching for unused translations (this may take a while)...")
    try:
        unused = find_unused_translations(keys, search_dirs)
    except Exception:
        print("\nAborting: Could not extract translations reliably. No changes were made.")
        sys.exit(1)

    if not unused:
        print("\nAll translations seem to be in use!")
        sys.exit(0)

    print(f"\nFound {len(unused)} unused translations.")

    confirm = input(f"Do you want to delete these {len(unused)} strings from {csv_path}? (y/N): ").lower()
    if confirm == "y":
        deleted_count = delete_unused_translations(csv_path, unused)
        print(f"Successfully deleted {deleted_count} unused translations from {csv_path}.")
    else:
        print("Cleanup cancelled. No changes were made.")
        print("\nUnused translations:")
        for key in sorted(unused):
            print(f"  - {key}")
