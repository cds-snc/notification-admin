import csv
import os
import subprocess
import sys


def get_translation_keys(csv_path):
    keys = []
    if not os.path.exists(csv_path):
        return keys

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["source"]:
                if row["source"].startswith("!/!/"):
                    continue
                keys.append(row["source"])
    return keys


def get_keys_from_babel():
    """Extract keys using the project's Babel configuration."""
    print("Extracting strings via Babel (this matches how 'make test-translations' works)...")
    try:
        # 1. Run pybabel extract
        subprocess.run(
            ["poetry", "run", "pybabel", "extract", "-F", "babel.cfg", "-k", "_l", "-o", "/tmp/cleanup_messages.po", "."],
            check=True,
            capture_output=True,
        )

        # 2. Run po2csv
        subprocess.run(
            ["poetry", "run", "po2csv", "/tmp/cleanup_messages.po", "/tmp/cleanup_messages.csv"], check=True, capture_output=True
        )

        # 3. Read extracted keys
        extracted_keys = set()
        with open("/tmp/cleanup_messages.csv", newline="") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                extracted_keys.add(row["source"])

        # Cleanup
        os.remove("/tmp/cleanup_messages.po")
        os.remove("/tmp/cleanup_messages.csv")

        return extracted_keys
    except Exception as e:
        print(f"Error extracting via Babel: {e}")
        return set()


def find_unused_translations(keys, search_dirs):
    # First, get keys that are used in code via Babel (covers Python/HTML)
    babel_keys = get_keys_from_babel()

    # Also need to consider hardcoded constant keys used in test-translations.py
    extra_keys = set(
        [
            "English Government of Canada signature",
            "French Government of Canada signature",
            "Empty",
            "1 template",
            "Number must have 10 digits",
            "bad invitation link",
            "invitation expired",
            "password",
            "Your service already uses ",
            "Try again. Something’s wrong with this code",
            "Code already sent, wait 10 seconds",
            "You cannot delete a default email reply to address if other reply to addresses exist",
            "Code has expired",
            "Code already sent",
            "Code has already been used",
            "Code not found",
            "as an email reply-to address.",
            "You cannot remove the only user for a service",
            "Cannot send to international mobile numbers",
        ]
    )

    # We also need to search for JS and CSS keys which Babel might miss
    # if they aren't marked with _().
    unused = set(keys) - babel_keys - extra_keys

    # Second pass: search remaining unused keys in JS and CSS files
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

                            to_remove = set()
                            for key in unused:
                                if key in content:
                                    to_remove.add(key)

                            unused -= to_remove
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

    print(f"Loading translations from {csv_path}...")
    keys = get_translation_keys(csv_path)
    print(f"Found {len(keys)} unique translation source strings.")

    print("Searching for unused translations (this may take a while)...")
    unused = find_unused_translations(keys, search_dirs)

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
