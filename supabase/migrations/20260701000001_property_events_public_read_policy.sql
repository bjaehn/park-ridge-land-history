-- property_events was created without a public SELECT policy, so the anon
-- client could never read any rows despite RLS being enabled on the table.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'property_events' AND policyname = 'public_read'
  ) THEN
    EXECUTE 'CREATE POLICY "public_read" ON property_events FOR SELECT USING (true)';
  END IF;
END $$;

GRANT SELECT ON property_events TO anon, authenticated;
