from __future__ import annotations

import argparse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

from scripts.data_sources import DATA_SOURCES, HISTORICAL_AERIAL_DOC_URL, PROJECT_ROOT


def download_source(url: str, destination: Path, force: bool) -> bool:
    if destination.exists() and not force:
        print(f"Skip existing: {destination.relative_to(PROJECT_ROOT)}")
        return True

    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        print(f"Downloading {url}")
        urllib.request.urlretrieve(url, destination)
    except Exception as exc:
        print(f"Could not download {url}: {exc}")
        return False

    print(f"Wrote {destination.relative_to(PROJECT_ROOT)}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Download configured public data sources.")
    parser.add_argument("--force", action="store_true", help="Overwrite files that already exist.")
    args = parser.parse_args()
    load_dotenv(PROJECT_ROOT / ".env")

    for source in DATA_SOURCES:
        print(f"\n{source.name}")
        print(f"  {source.description}")
        if source.url:
            ok = download_source(source.url, source.local_path, args.force)
            if not ok and source.required_for_build:
                print("  Required source failed. Add the file manually or update .env with a working URL.")
        else:
            print(f"  No URL configured for {source.env_url}.")
            print(f"  Place a manually downloaded file at: {source.local_path.relative_to(PROJECT_ROOT)}")

    print("\nHistorical aerial imagery")
    print(f"  Documented source: {HISTORICAL_AERIAL_DOC_URL}")
    print("  Georeferenced tile ingestion is intentionally left as future work for v1.")


if __name__ == "__main__":
    main()
