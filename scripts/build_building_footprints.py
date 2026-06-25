import json
import pathlib

SRC = pathlib.Path("public/data/historical/cook_county_building_footprints_2017.geojson")
DST = pathlib.Path("public/data/park_ridge_building_footprints.geojson")


def trim(ring):
    return [[round(x, 5), round(y, 5)] for x, y in ring]


def slim_geom(g):
    if g["type"] == "Polygon":
        return {"type": "Polygon", "coordinates": [trim(r) for r in g["coordinates"]]}
    elif g["type"] == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [[trim(r) for r in p] for p in g["coordinates"]],
        }
    return g


data = json.loads(SRC.read_text(encoding="utf-8"))
slim = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": slim_geom(f["geometry"]),
            "properties": {
                "oid": f["properties"].get("objectid"),
                "sqft": round(f["properties"].get("footprint_sqft") or 0),
                "ht": round(f["properties"].get("height_ft") or 0, 1),
            },
        }
        for f in data["features"]
        if f.get("geometry") is not None
    ],
}
DST.write_text(json.dumps(slim, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(slim['features'])} features to {DST}")
src_mb = SRC.stat().st_size / 1_000_000
dst_mb = DST.stat().st_size / 1_000_000
print(f"Size: {src_mb:.1f} MB -> {dst_mb:.1f} MB ({dst_mb/src_mb*100:.0f}%)")
