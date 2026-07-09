CREATE TABLE admin_change_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   text NOT NULL,
  row_id       text NOT NULL,
  field_name   text NOT NULL,
  old_value    text,
  new_value    text,
  action       text NOT NULL,
  actor        text NOT NULL,
  change_group uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_change_log_created_at_idx ON admin_change_log (created_at DESC);
CREATE INDEX admin_change_log_table_row_idx ON admin_change_log (table_name, row_id);

ALTER TABLE admin_change_log ENABLE ROW LEVEL SECURITY;
-- Admin-only: no public or authenticated access (service_role bypasses RLS).
DROP POLICY IF EXISTS "admin_only" ON admin_change_log;
CREATE POLICY "admin_only" ON admin_change_log USING (false);
