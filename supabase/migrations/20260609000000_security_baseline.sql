-- Security and schema baseline for the driver app.
-- Review in staging before applying to production.

-- Keep the app schema aligned with the driver profile UI.
alter table public.drivers
  add column if not exists bank_name text,
  add column if not exists bank_account_holder text,
  add column if not exists bank_clabe text;

-- Core lookup and feed indexes used by the driver app.
create unique index if not exists drivers_auth_id_key
  on public.drivers(auth_id)
  where auth_id is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name in ('created_at', 'status', 'driver_id')
    group by table_schema, table_name
    having count(*) = 3
  ) then
    execute $idx$
      create index if not exists trips_open_offers_idx
      on public.trips(created_at desc)
      where status = 'pendiente_asignacion' and driver_id is null
    $idx$;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name in ('driver_id', 'updated_at', 'status')
    group by table_schema, table_name
    having count(*) = 3
  ) then
    execute $idx$
      create index if not exists trips_driver_active_idx
      on public.trips(driver_id, updated_at desc)
      where status in (
        'conductor_asignado',
        'conductor_en_camino',
        'recoleccion_proceso',
        'evidencia_inicial_pendiente',
        'traslado_curso',
        'entrega_proceso',
        'evidencia_final_pendiente'
      )
    $idx$;
  end if;
end;
$$;

create index if not exists documents_owner_idx
  on public.documents(owner_type, owner_id, created_at desc);

create index if not exists documents_owner_type_key
  on public.documents(owner_id, owner_type, type);

create index if not exists evidence_trip_idx
  on public.evidence(trip_id, created_at desc);

create index if not exists evidence_photos_evidence_idx
  on public.evidence_photos(evidence_id, created_at desc);

create index if not exists payments_trip_type_idx
  on public.payments(trip_id, type, created_at desc);

-- RLS must be enabled explicitly on every user-facing table.
alter table public.drivers enable row level security;
alter table public.trips enable row level security;
alter table public.documents enable row level security;
alter table public.evidence enable row level security;
alter table public.evidence_photos enable row level security;
alter table public.payments enable row level security;
alter table public.incidents enable row level security;

-- Prior user-app migrations used restrictive false policies to block client writes.
-- They also block driver/admin payments writes, so replace them with scoped policies below.
drop policy if exists payments_no_client_insert on public.payments;
drop policy if exists payments_no_client_update on public.payments;

-- Admin compatibility: the admin app reads and mutates these tables with an
-- authenticated admin session after checking admin_users. Keep broad table
-- access here and enforce role granularity in app/RPC logic.
drop policy if exists "active admins can manage drivers" on public.drivers;
create policy "active admins can manage drivers"
on public.drivers
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "active admins can manage trips" on public.trips;
create policy "active admins can manage trips"
on public.trips
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "active admins can manage documents" on public.documents;
create policy "active admins can manage documents"
on public.documents
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "active admins can manage evidence" on public.evidence;
create policy "active admins can manage evidence"
on public.evidence
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "active admins can manage evidence photos" on public.evidence_photos;
create policy "active admins can manage evidence photos"
on public.evidence_photos
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "active admins can manage payments" on public.payments;
create policy "active admins can manage payments"
on public.payments
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "active admins can manage incidents" on public.incidents;
create policy "active admins can manage incidents"
on public.incidents
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- Driver profile: users can read and update their own row.
drop policy if exists "drivers can read own profile" on public.drivers;
create policy "drivers can read own profile"
on public.drivers
for select
to authenticated
using (auth_id = auth.uid());

drop policy if exists "drivers can update own profile" on public.drivers;
create policy "drivers can update own profile"
on public.drivers
for update
to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

-- Trips: drivers can see open offers and their assigned trips when the
-- deployed schema has the columns used by the driver app.
drop policy if exists "drivers can read open and assigned trips" on public.trips;
drop policy if exists "drivers can read assigned trips" on public.trips;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name in ('status', 'driver_id')
    group by table_schema, table_name
    having count(*) = 2
  ) then
    execute $policy$
      create policy "drivers can read open and assigned trips"
      on public.trips
      for select
      to authenticated
      using (
        (status = 'pendiente_asignacion' and driver_id is null)
        or driver_id in (
          select id from public.drivers where auth_id = auth.uid()
        )
      )
    $policy$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name = 'driver_id'
  ) then
    execute $policy$
      create policy "drivers can read assigned trips"
      on public.trips
      for select
      to authenticated
      using (
        driver_id in (
          select id from public.drivers where auth_id = auth.uid()
        )
      )
    $policy$;
  end if;
end;
$$;

-- User compatibility: preserve user-app reads for trips, evidence and photos.
drop policy if exists "users can read own trip evidence" on public.evidence;
create policy "users can read own trip evidence"
on public.evidence
for select
to authenticated
using (
  trip_id in (
    select t.id
    from public.trips t
    join public.app_users u on u.id::text = t.user_id::text
    where u.auth_id = auth.uid()
  )
);

drop policy if exists "users can read own trip evidence photos" on public.evidence_photos;
create policy "users can read own trip evidence photos"
on public.evidence_photos
for select
to authenticated
using (
  evidence_id in (
    select e.id
    from public.evidence e
    join public.trips t on t.id = e.trip_id
    join public.app_users u on u.id::text = t.user_id::text
    where u.auth_id = auth.uid()
  )
);

-- Documents: drivers can manage their own documents only.
drop policy if exists "drivers can read own documents" on public.documents;
create policy "drivers can read own documents"
on public.documents
for select
to authenticated
using (
  owner_type = 'driver'
  and owner_id in (
    select id from public.drivers where auth_id = auth.uid()
  )
);

drop policy if exists "drivers can upsert own documents" on public.documents;
create policy "drivers can upsert own documents"
on public.documents
for insert
to authenticated
with check (
  owner_type = 'driver'
  and owner_id in (
    select id from public.drivers where auth_id = auth.uid()
  )
);

drop policy if exists "drivers can update own documents" on public.documents;
create policy "drivers can update own documents"
on public.documents
for update
to authenticated
using (
  owner_type = 'driver'
  and owner_id in (
    select id from public.drivers where auth_id = auth.uid()
  )
)
with check (
  owner_type = 'driver'
  and owner_id in (
    select id from public.drivers where auth_id = auth.uid()
  )
);

-- Evidence: drivers can create and read evidence for trips assigned to them.
drop policy if exists "drivers can read assigned trip evidence" on public.evidence;
create policy "drivers can read assigned trip evidence"
on public.evidence
for select
to authenticated
using (
  trip_id in (
    select t.id
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

drop policy if exists "drivers can create assigned trip evidence" on public.evidence;
create policy "drivers can create assigned trip evidence"
on public.evidence
for insert
to authenticated
with check (
  trip_id in (
    select t.id
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

drop policy if exists "drivers can read assigned trip evidence photos" on public.evidence_photos;
create policy "drivers can read assigned trip evidence photos"
on public.evidence_photos
for select
to authenticated
using (
  evidence_id in (
    select e.id
    from public.evidence e
    join public.trips t on t.id = e.trip_id
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

drop policy if exists "drivers can create assigned trip evidence photos" on public.evidence_photos;
create policy "drivers can create assigned trip evidence photos"
on public.evidence_photos
for insert
to authenticated
with check (
  evidence_id in (
    select e.id
    from public.evidence e
    join public.trips t on t.id = e.trip_id
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

-- Payments and incidents are scoped through assigned trips.
drop policy if exists "drivers can read own trip payments" on public.payments;
create policy "drivers can read own trip payments"
on public.payments
for select
to authenticated
using (
  trip_id in (
    select t.id
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

drop policy if exists "drivers can create own trip expenses" on public.payments;
create policy "drivers can create own trip expenses"
on public.payments
for insert
to authenticated
with check (
  type = 'gasto'
  and trip_id in (
    select t.id
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

drop policy if exists "drivers can create own trip incidents" on public.incidents;
create policy "drivers can create own trip incidents"
on public.incidents
for insert
to authenticated
with check (
  trip_id in (
    select t.id
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

drop policy if exists "drivers can read own trip incidents" on public.incidents;
create policy "drivers can read own trip incidents"
on public.incidents
for select
to authenticated
using (
  trip_id in (
    select t.id
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where d.auth_id = auth.uid()
  )
);

-- Storage: driver documents are stored under documents/drivers/{driver_id}/...
drop policy if exists "drivers can upload own document files" on storage.objects;
create policy "drivers can upload own document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] in (
    select id::text from public.drivers where auth_id = auth.uid()
  )
);

drop policy if exists "active admins can manage document files" on storage.objects;
create policy "active admins can manage document files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'documents'
  and public.is_active_admin()
)
with check (
  bucket_id = 'documents'
  and public.is_active_admin()
);

drop policy if exists "active admins can manage evidence files" on storage.objects;
create policy "active admins can manage evidence files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'evidence'
  and public.is_active_admin()
)
with check (
  bucket_id = 'evidence'
  and public.is_active_admin()
);

drop policy if exists "drivers can read own document files" on storage.objects;
create policy "drivers can read own document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] in (
    select id::text from public.drivers where auth_id = auth.uid()
  )
);

drop policy if exists "drivers can update own document files" on storage.objects;
create policy "drivers can update own document files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] in (
    select id::text from public.drivers where auth_id = auth.uid()
  )
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] in (
    select id::text from public.drivers where auth_id = auth.uid()
  )
);
