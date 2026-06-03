# Georeferencing Historical Imagery

Historical aerials and map sheets should not be enabled as map layers until they are georeferenced and checked.

Recommended workflow:

1. Identify imagery frames or sheets covering Park Ridge.
2. Record source, year, frame or sheet id, license, and download date.
3. Georeference against stable road intersections, rail corridors, and section lines.
4. Save control-point notes with residual error.
5. Tile the georeferenced raster for web display.
6. Register the tile URL and attribution in `data/historical_layers.registry.json`.

ILHAP 1938/1939 imagery is especially useful for prewar development evidence, but it needs this georeferencing pass before it should be used in the app.

