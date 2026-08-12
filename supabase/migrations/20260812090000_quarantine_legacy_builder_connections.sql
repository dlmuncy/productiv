/*
  Productiv Phase 1 security hardening.
  The former browser token vault stored reversible credential material in builder_connections.
  Productiv no longer reads or writes that table. Keep legacy rows intact for owner-directed
  recovery, but deny all browser access so old credentials cannot be exposed client-side.
*/
ALTER TABLE IF EXISTS builder_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_connections" ON builder_connections;
DROP POLICY IF EXISTS "insert_own_connections" ON builder_connections;
DROP POLICY IF EXISTS "update_own_connections" ON builder_connections;
DROP POLICY IF EXISTS "delete_own_connections" ON builder_connections;
CREATE POLICY "quarantine_legacy_connections_select" ON builder_connections FOR SELECT USING (false);
CREATE POLICY "quarantine_legacy_connections_insert" ON builder_connections FOR INSERT WITH CHECK (false);
CREATE POLICY "quarantine_legacy_connections_update" ON builder_connections FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "quarantine_legacy_connections_delete" ON builder_connections FOR DELETE USING (false);
COMMENT ON TABLE builder_connections IS 'QUARANTINED legacy credential table. Productiv Phase 1 uses server-side environment secret references instead.';
