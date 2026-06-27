-- appeals and assessments had RLS enabled but no public SELECT policy,
-- so the browser client silently received zero rows.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appeals' AND policyname = 'public_read'
  ) THEN
    EXECUTE 'CREATE POLICY "public_read" ON appeals FOR SELECT USING (true)';
  END IF;
END $$;
GRANT SELECT ON appeals TO anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assessments' AND policyname = 'public_read'
  ) THEN
    EXECUTE 'CREATE POLICY "public_read" ON assessments FOR SELECT USING (true)';
  END IF;
END $$;
GRANT SELECT ON assessments TO anon, authenticated;
