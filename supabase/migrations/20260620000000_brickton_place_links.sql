-- Link 58 properties to BRICKTON PLACE subdivision.
-- Source: Cook County Recorder plat 97378176, recorded 1997-04-21.

DO $$
DECLARE
  sub_id uuid;
  pins   text[] := ARRAY[
    '12011170220000',
    '12011170230000',
    '12011170240000',
    '12011170250000',
    '12011170260000',
    '12011170270000',
    '12011170280000',
    '12011170290000',
    '12011170300000',
    '12011170310000',
    '12011170320000',
    '12011170330000',
    '12011170340000',
    '12011170350000',
    '12011170360000',
    '12011170370000',
    '12011170380000',
    '12011170390000',
    '12011170400000',
    '12011170410000',
    '12011170420000',
    '12011170430000',
    '12011170440000',
    '12011170450000',
    '12011170460000',
    '12011170470000',
    '12011170480000',
    '12013020180000',
    '12013020190000',
    '12013020200000',
    '12013020210000',
    '12013020220000',
    '12013020230000',
    '12013020250000',
    '12013020260000',
    '12013030220000',
    '12013030230000',
    '12013030240000',
    '12013030250000',
    '12013030260000',
    '12013030270000',
    '12013030280000',
    '12013030290000',
    '12013030300000',
    '12013030310000',
    '12013030320000',
    '12013030330000',
    '12013030340000',
    '12013030350000',
    '12013030360000',
    '12013030370000',
    '12013030380000',
    '12013030390000',
    '12013030400000',
    '12013030410000',
    '12013030420000',
    '12013030430000',
    '12013030440000'
  ];
  p text;
BEGIN
  SELECT id INTO sub_id
  FROM subdivisions
  WHERE name ILIKE 'brickton place'
  LIMIT 1;

  IF sub_id IS NULL THEN
    RAISE EXCEPTION 'Subdivision "BRICKTON PLACE" not found — create it first.';
  END IF;

  FOREACH p IN ARRAY pins LOOP
    INSERT INTO property_subdivision_links
      (pin, subdivision_id, match_method, confidence_level, source_name, source_reference)
    VALUES
      (p, sub_id, 'plat_document', 'high',
       'Cook County Recorder', 'Plat 97378176, recorded 1997-04-21')
    ON CONFLICT (pin, subdivision_id) DO UPDATE SET
      match_method     = EXCLUDED.match_method,
      confidence_level = EXCLUDED.confidence_level,
      source_name      = EXCLUDED.source_name,
      source_reference = EXCLUDED.source_reference;
  END LOOP;

  -- Keep the denormalized count in sync
  UPDATE subdivisions
  SET parcel_count = (
    SELECT COUNT(*) FROM property_subdivision_links WHERE subdivision_id = sub_id
  )
  WHERE id = sub_id;

  RAISE NOTICE 'Linked % properties to BRICKTON PLACE (id: %)', array_length(pins, 1), sub_id;
END;
$$;
