import argparse
import re
import sys
from datetime import date
from pathlib import Path

LIFESPAN_PATTERN = re.compile(r"new_feature\([\s\S]*?lifespan\s*=\s*[\"'](.*?)[\"']\s*[\s\)]")


def expired_banners(template_folder, today):
    expired = []
    invalid = []

    for template_path in sorted(template_folder.rglob("*.html")):
        template = template_path.read_text()
        for match in LIFESPAN_PATTERN.finditer(template):
            lifespan = match.group(1)
            if not lifespan:
                continue

            try:
                expiration_date = date.fromisoformat(lifespan)
            except ValueError:
                invalid.append((template_path, lifespan))
                continue

            if expiration_date <= today:
                line_number = template[: match.start()].count("\n") + 1
                expired.append((template_path, line_number, lifespan))

    return expired, invalid


def main():
    parser = argparse.ArgumentParser(description="Find expired new-feature banners.")
    parser.add_argument(
        "--today",
        type=date.fromisoformat,
        default=date.today(),
        help="Date to compare against (YYYY-MM-DD).",
    )
    parser.add_argument(
        "--template-folder",
        type=Path,
        default=Path(__file__).parent.parent / "app/templates",
        help="Folder containing Jinja templates.",
    )
    args = parser.parse_args()

    expired, invalid = expired_banners(args.template_folder, args.today)
    for template_path, lifespan in invalid:
        print(f"{template_path}: invalid banner lifespan: {lifespan}", file=sys.stderr)

    for template_path, line_number, lifespan in expired:
        print(f"{template_path}:{line_number}: banner expired on {lifespan}")

    return 1 if expired or invalid else 0


if __name__ == "__main__":
    sys.exit(main())
