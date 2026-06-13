#!/usr/bin/env python3
"""
Park Ridge Land History — ETL Runner

Loads enriched flat-file data into Supabase.
Run with: python -m etl.run_etl [--dry-run] [--loaders properties,permits,sales]

If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set, runs in LOCAL_ONLY_MODE
and reports what would be loaded without writing to Supabase.
"""

import argparse
import json
import logging
import sys
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("etl.runner")


def main():
    parser = argparse.ArgumentParser(description="Park Ridge Land History ETL Runner")
    parser.add_argument("--dry-run", action="store_true", help="Validate but do not write to Supabase")
    parser.add_argument(
        "--loaders",
        default="properties,permits",
        help="Comma-separated list of loaders to run (default: properties,permits)"
    )
    parser.add_argument(
        "--geojson",
        default="public/data/park_ridge_parcels_enriched.geojson",
        help="Path to enriched GeoJSON file"
    )
    args = parser.parse_args()

    selected_loaders = {l.strip() for l in args.loaders.split(",")}
    run_id = None
    started_at = datetime.utcnow()
    all_results = {}

    logger.info(f"=== ETL Run Started: {started_at.isoformat()} ===")
    logger.info(f"Loaders: {selected_loaders}")
    logger.info(f"GeoJSON: {args.geojson}")
    logger.info(f"Dry run: {args.dry_run}")

    if "properties" in selected_loaders:
        from etl.loaders.properties import load_properties_from_geojson
        logger.info("--- Loading properties ---")
        result = load_properties_from_geojson(
            geojson_path=args.geojson,
            import_run_id=run_id,
            dry_run=args.dry_run,
        )
        all_results["properties"] = result
        logger.info(f"Properties: {result}")

    if "permits" in selected_loaders:
        from etl.loaders.permits import load_permits_from_geojson
        logger.info("--- Loading permits ---")
        result = load_permits_from_geojson(
            geojson_path=args.geojson,
            import_run_id=run_id,
            dry_run=args.dry_run,
        )
        all_results["permits"] = result
        logger.info(f"Permits: {result}")

    finished_at = datetime.utcnow()
    duration = (finished_at - started_at).total_seconds()

    logger.info(f"=== ETL Run Complete: {duration:.1f}s ===")
    logger.info(json.dumps(all_results, indent=2))

    # Write summary log
    log_path = f"etl/logs/run_{started_at.strftime('%Y%m%d_%H%M%S')}.json"
    import os
    os.makedirs("etl/logs", exist_ok=True)
    with open(log_path, "w") as f:
        json.dump({
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "duration_seconds": duration,
            "dry_run": args.dry_run,
            "loaders": list(selected_loaders),
            "results": all_results,
        }, f, indent=2)
    logger.info(f"Log written to {log_path}")


if __name__ == "__main__":
    main()
