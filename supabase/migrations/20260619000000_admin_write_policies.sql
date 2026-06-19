-- Explicit write policies for the service_role on every table the admin
-- needs to INSERT, UPDATE, or DELETE. The service_role JWT should bypass
-- RLS by default, but these policies ensure writes succeed regardless of
-- how the Supabase project's role configuration is set up.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivisions' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on subdivisions
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'historical_subdivision_lineage' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on historical_subdivision_lineage
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'property_subdivision_links' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on property_subdivision_links
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivision_lots' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on subdivision_lots
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivision_timeline_events' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on subdivision_timeline_events
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivision_sources' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on subdivision_sources
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivision_aliases' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on subdivision_aliases
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivision_research_tasks' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on subdivision_research_tasks
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcels' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on parcels
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'property_events' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on property_events
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_change_events' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on parcel_change_events
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_lineage_edges' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on parcel_lineage_edges
      for all to service_role using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'neighborhoods' and policyname = 'service_role_write'
  ) then
    execute 'create policy "service_role_write" on neighborhoods
      for all to service_role using (true) with check (true)';
  end if;
end $$;
