-- Allow public (anon) reads on neighborhoods so the Next.js server component
-- can look up a neighborhood by slug without going through an RPC.
-- Writes remain restricted to service_role only.
CREATE POLICY "public_read" ON neighborhoods FOR SELECT TO anon, authenticated USING (true);
