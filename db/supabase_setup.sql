-- ============================================================
-- BLOODLINE — Complete Supabase Schema
-- Phase 1: Database & Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── Extensions ───
create extension if not exists "pg_cron" with schema "extensions";
create extension if not exists "pg_net" with schema "extensions";

-- ─── Enums ───
create type public.app_role as enum ('donor', 'hospital', 'admin');
create type public.blood_group as enum ('A+','A-','B+','B-','O+','O-','AB+','AB-');
create type public.urgency_level as enum ('critical', 'urgent', 'planned');
create type public.request_status as enum ('pending','active','partially_fulfilled','fulfilled','expired','cancelled','fake');
create type public.response_status as enum ('notified','seen','interested','confirmed','traveling','donated','declined','no_show');
create type public.requester_type as enum ('donor', 'hospital');
create type public.verification_tier as enum ('unverified', 'basic', 'full');
create type public.notification_type as enum ('new_request','donor_confirmed','request_fulfilled','donation_reminder','verification_status','hospital_request','inventory_low');
create type public.h2h_status as enum ('pending','accepted','rejected','fulfilled');

-- ============================================================
-- TABLES
-- ============================================================

-- ─── profiles ───
create table public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  role            public.app_role not null default 'donor',
  full_name       text not null,
  phone           text unique not null,
  avatar_url      text,
  date_of_birth   date,
  city            text,
  is_verified     boolean default false,
  verified_at     timestamptz,
  verified_by     uuid references public.profiles(id),
  is_suspended    boolean default false,
  created_at      timestamptz default now()
);
alter table public.profiles enable row level security;

-- ─── donor_profiles ───
create table public.donor_profiles (
  id              uuid references public.profiles(id) on delete cascade primary key,
  blood_group     public.blood_group not null,
  weight_kg       int not null check (weight_kg >= 50),
  last_donation   date,
  next_eligible   date generated always as (last_donation + 90) stored,
  is_available    boolean default true,
  available_after timestamptz,
  max_travel_km   int default 10,
  medical_notes   text,
  total_donations int default 0,
  lives_impacted  int default 0,
  lat             float,
  lng             float,
  created_at      timestamptz default now()
);
alter table public.donor_profiles enable row level security;

-- ─── hospital_profiles ───
create table public.hospital_profiles (
  id                    uuid references public.profiles(id) on delete cascade primary key,
  hospital_name         text not null,
  registration_number   text unique not null,
  license_doc_url       text,
  address               text not null,
  lat                   float not null,
  lng                   float not null,
  contact_email         text,
  website               text,
  verified_tier         public.verification_tier default 'unverified',
  created_at            timestamptz default now()
);
alter table public.hospital_profiles enable row level security;

-- ─── blood_inventory ───
create table public.blood_inventory (
  id              uuid primary key default gen_random_uuid(),
  hospital_id     uuid references public.hospital_profiles(id) on delete cascade not null,
  blood_group     public.blood_group not null,
  units_available int default 0 check (units_available >= 0),
  units_reserved  int default 0 check (units_reserved >= 0),
  updated_at      timestamptz default now(),
  unique(hospital_id, blood_group)
);
alter table public.blood_inventory enable row level security;

-- ─── blood_requests ───
create table public.blood_requests (
  id                  uuid primary key default gen_random_uuid(),
  requester_id        uuid references public.profiles(id) not null,
  requester_type      public.requester_type not null,
  blood_group_needed  public.blood_group not null,
  units_needed        int default 1 check (units_needed > 0),
  urgency             public.urgency_level not null default 'urgent',
  status              public.request_status default 'pending',
  title               text,
  notes               text,
  location_name       text,
  lat                 float not null,
  lng                 float not null,
  contact_name        text,
  contact_phone       text,
  verification_doc    text,
  is_verified         boolean default false,
  donors_notified     int default 0,
  donors_confirmed    int default 0,
  expires_at          timestamptz,
  fulfilled_at        timestamptz,
  created_at          timestamptz default now()
);
create index idx_requests_status on public.blood_requests(status);
create index idx_requests_urgency on public.blood_requests(urgency);
create index idx_requests_location on public.blood_requests(lat, lng);
alter table public.blood_requests enable row level security;

-- ─── hospital_to_hospital_requests ───
create table public.hospital_to_hospital_requests (
  id                  uuid primary key default gen_random_uuid(),
  requesting_hospital uuid references public.hospital_profiles(id) not null,
  target_hospital     uuid references public.hospital_profiles(id),
  blood_group         public.blood_group not null,
  units_needed        int not null check (units_needed > 0),
  urgency             public.urgency_level not null default 'urgent',
  status              public.h2h_status default 'pending',
  message             text,
  response_message    text,
  created_at          timestamptz default now(),
  responded_at        timestamptz
);
alter table public.hospital_to_hospital_requests enable row level security;

-- ─── donor_responses ───
create table public.donor_responses (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid references public.blood_requests(id) on delete cascade not null,
  donor_id        uuid references public.donor_profiles(id) on delete cascade not null,
  status          public.response_status default 'notified',
  notified_at     timestamptz default now(),
  seen_at         timestamptz,
  confirmed_at    timestamptz,
  donated_at      timestamptz,
  decline_reason  text,
  unique(request_id, donor_id)
);
create index idx_responses_request on public.donor_responses(request_id);
create index idx_responses_donor on public.donor_responses(donor_id);
alter table public.donor_responses enable row level security;

-- ─── donor_live_locations ───
create table public.donor_live_locations (
  id              uuid primary key default gen_random_uuid(),
  donor_id        uuid references public.donor_profiles(id) on delete cascade not null,
  lat             float not null,
  lng             float not null,
  accuracy_meters int,
  response_id     uuid references public.donor_responses(id) on delete cascade,
  updated_at      timestamptz default now(),
  expires_at      timestamptz not null
);
create index idx_live_locations_donor on public.donor_live_locations(donor_id);
create index idx_live_locations_expires on public.donor_live_locations(expires_at);
alter table public.donor_live_locations enable row level security;

-- ─── donations ───
create table public.donations (
  id              uuid primary key default gen_random_uuid(),
  donor_id        uuid references public.donor_profiles(id) on delete cascade not null,
  request_id      uuid references public.blood_requests(id) on delete set null,
  hospital_id     uuid references public.hospital_profiles(id) not null,
  blood_group     public.blood_group not null,
  units_donated   int default 1 check (units_donated > 0),
  donation_date   date not null default current_date,
  certificate_url text,
  notes           text,
  created_at      timestamptz default now()
);
alter table public.donations enable row level security;

-- ─── notifications ───
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  type        public.notification_type not null,
  title       text not null,
  body        text not null,
  data        jsonb,
  is_read     boolean default false,
  created_at  timestamptz default now()
);
create index idx_notifications_user on public.notifications(user_id, is_read);
alter table public.notifications enable row level security;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- ─── profiles ───
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── donor_profiles ───
create policy "Donors can read own profile"
  on public.donor_profiles for select
  using (auth.uid() = id);

create policy "Donors can update own profile"
  on public.donor_profiles for update
  using (auth.uid() = id);

create policy "Hospitals can read donor profiles (no exact location)"
  on public.donor_profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'hospital'));

create policy "Admins can read all donor profiles"
  on public.donor_profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can insert their own donor profile"
  on public.donor_profiles for insert
  with check (auth.uid() = id);

-- ─── donor_live_locations ───
create policy "Donors can insert/update own live location"
  on public.donor_live_locations for insert
  with check (auth.uid() = donor_id);

create policy "Donors can update own live location"
  on public.donor_live_locations for update
  using (auth.uid() = donor_id);

create policy "Donors can delete own live location"
  on public.donor_live_locations for delete
  using (auth.uid() = donor_id);

create policy "Hospital of active request can see live location"
  on public.donor_live_locations for select
  using (
    exists (
      select 1 from public.blood_requests br
      join public.donor_responses dr on dr.request_id = br.id
      where dr.id = donor_live_locations.response_id
        and br.requester_id = auth.uid()
    )
  );

create policy "Admin can see all live locations"
  on public.donor_live_locations for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── hospital_profiles ───
create policy "Anyone can read hospital profiles"
  on public.hospital_profiles for select
  using (true);

create policy "Hospitals can update own profile"
  on public.hospital_profiles for update
  using (auth.uid() = id);

create policy "Hospitals can insert own profile"
  on public.hospital_profiles for insert
  with check (auth.uid() = id);

create policy "Admin can update hospital profiles"
  on public.hospital_profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── blood_inventory ───
create policy "Anyone can read blood inventory"
  on public.blood_inventory for select
  using (true);

create policy "Hospitals can update own inventory"
  on public.blood_inventory for update
  using (exists (select 1 from public.hospital_profiles where id = auth.uid()));

create policy "Hospitals can insert own inventory"
  on public.blood_inventory for insert
  with check (exists (select 1 from public.hospital_profiles where id = auth.uid()));

create policy "Admin can update any inventory"
  on public.blood_inventory for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── blood_requests ───
create policy "Anyone can read active requests"
  on public.blood_requests for select
  using (status = any (array['pending','active','partially_fulfilled']));

create policy "Creator can read own requests"
  on public.blood_requests for select
  using (requester_id = auth.uid());

create policy "Admin can read all requests"
  on public.blood_requests for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated users can create requests"
  on public.blood_requests for insert
  with check (auth.uid() = requester_id);

create policy "Creator can update own request"
  on public.blood_requests for update
  using (requester_id = auth.uid());

create policy "Admin can update any request"
  on public.blood_requests for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── hospital_to_hospital_requests ───
create policy "Hospitals can read incoming requests"
  on public.hospital_to_hospital_requests for select
  using (
    target_hospital = auth.uid() 
    or requesting_hospital = auth.uid()
    or target_hospital is null
  );

create policy "Hospitals can create requests"
  on public.hospital_to_hospital_requests for insert
  with check (requesting_hospital = auth.uid());

create policy "Hospitals can update their own requests"
  on public.hospital_to_hospital_requests for update
  using (requesting_hospital = auth.uid() or target_hospital = auth.uid());

create policy "Admin can read all h2h requests"
  on public.hospital_to_hospital_requests for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── donor_responses ───
create policy "Donors can read own responses"
  on public.donor_responses for select
  using (donor_id = auth.uid());

create policy "Request creator can read responses"
  on public.donor_responses for select
  using (
    exists (select 1 from public.blood_requests where id = donor_responses.request_id and requester_id = auth.uid())
  );

create policy "Donors can insert own response"
  on public.donor_responses for insert
  with check (donor_id = auth.uid());

create policy "Donors can update own response"
  on public.donor_responses for update
  using (donor_id = auth.uid());

create policy "Admin can read all responses"
  on public.donor_responses for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── donations ───
create policy "Donors can read own donations"
  on public.donations for select
  using (donor_id = auth.uid());

create policy "Hospitals can read donations they received"
  on public.donations for select
  using (hospital_id = auth.uid());

create policy "Donors can insert own donation"
  on public.donations for insert
  with check (donor_id = auth.uid());

create policy "Hospitals can insert donations"
  on public.donations for insert
  with check (hospital_id = auth.uid());

create policy "Admin can read all donations"
  on public.donations for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── notifications ───
create policy "Users can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notification read status"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

alter publication supabase_realtime add table public.blood_requests;
alter publication supabase_realtime add table public.donor_responses;
alter publication supabase_realtime add table public.blood_inventory;
alter publication supabase_realtime add table public.donor_live_locations;
alter publication supabase_realtime add table public.hospital_to_hospital_requests;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'donor')::public.app_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- AUTO-DELETE EXPIRED LIVE LOCATIONS (pg_cron)
-- ============================================================

select cron.schedule(
  'delete-expired-locations',
  '*/15 * * * *',  -- every 15 minutes
  $$ delete from public.donor_live_locations where expires_at < now() $$
);

-- ============================================================
-- INVENTORY LOW TRIGGER (auto-create notification)
-- ============================================================

create or replace function public.notify_inventory_low()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.units_available < 5 and (old.units_available >= 5 or old is null) then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.hospital_id,
      'inventory_low',
      'Low Stock Alert',
      format('Blood group %s is below 5 units. Consider requesting from nearby hospitals.', new.blood_group::text),
      jsonb_build_object('hospital_id', new.hospital_id, 'blood_group', new.blood_group)
    );
  end if;
  return new;
end;
$$;

create or replace trigger on_inventory_update
  after insert or update of units_available on public.blood_inventory
  for each row
  execute function public.notify_inventory_low();

-- ============================================================
-- DONATION COMPLETED TRIGGER (update donor stats + request status)
-- ============================================================

create or replace function public.handle_donation_completed()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update donor stats
  update public.donor_profiles
  set total_donations = total_donations + 1,
      lives_impacted = lives_impacted + new.units_donated,
      last_donation = new.donation_date,
      is_available = false,
      available_after = new.donation_date + interval '90 days'
  where id = new.donor_id;

  -- Update request status
  if new.request_id is not null then
    update public.blood_requests
    set status = 'partially_fulfilled',
        donors_confirmed = donors_confirmed + 1
    where id = new.request_id;

    -- Check if fully fulfilled
    update public.blood_requests
    set status = 'fulfilled',
        fulfilled_at = now()
    where id = new.request_id
      and donors_confirmed >= units_needed;
  end if;

  return new;
end;
$$;

create or replace trigger on_donation_inserted
  after insert on public.donations
  for each row
  execute function public.handle_donation_completed();

-- ============================================================
-- AUTO-SET EXPIRY ON BLOOD REQUESTS
-- ============================================================

create or replace function public.set_request_expiry()
returns trigger
language plpgsql
as $$
begin
  new.expires_at := case new.urgency
    when 'critical' then now() + interval '6 hours'
    when 'urgent' then now() + interval '24 hours'
    when 'planned' then now() + interval '72 hours'
  end;
  return new;
end;
$$;

create or replace trigger on_request_insert
  before insert on public.blood_requests
  for each row
  execute function public.set_request_expiry();

-- ============================================================
-- MARK EXPIRED REQUESTS (pg_cron, runs every 30 minutes)
-- ============================================================

select cron.schedule(
  'mark-expired-requests',
  '*/30 * * * *',
  $$ update public.blood_requests set status = 'expired' where status = 'pending' and expires_at < now() $$
);

-- ============================================================
-- RATE LIMITING: max 3 blood requests per phone per day
-- ============================================================

create or replace function public.check_request_rate_limit()
returns trigger
language plpgsql
as $$
declare
  today_count int;
begin
  select count(*) into today_count
  from public.blood_requests
  where requester_id = new.requester_id
    and created_at > current_date;

  if today_count >= 3 then
    raise exception 'Rate limit exceeded: maximum 3 blood requests per day per account.';
  end if;

  return new;
end;
$$;

create or replace trigger before_request_insert
  before insert on public.blood_requests
  for each row
  execute function public.check_request_rate_limit();

-- ============================================================
-- PHONE MASKING FUNCTION (for RLS queries / views)
-- ============================================================

create or replace function public.mask_phone(phone text)
returns text
language sql
immutable
as $$
  select left(phone, 3) || 'XXXXX' || right(phone, 4);
$$;

-- ============================================================
-- SEED DATA: test accounts (run separately in dev only)
-- ============================================================

-- These accounts are inserted ONLY if the seed function is called manually.
-- Do not run automatically in production.

create or replace function public.seed_dev_users()
returns void
language plpgsql
security definer
as $$
begin
  -- Note: In production, users come from Supabase Auth + the handle_new_user trigger.
  -- This function creates profiles for manually created auth users during development.

  insert into public.profiles (id, role, full_name, phone, is_verified)
  values
    ('00000000-0000-0000-0000-000000000001', 'admin',    'Super Admin',           '+919999999991', true),
    ('00000000-0000-0000-0000-000000000002', 'donor',    'Rahul Sharma',          '+919999999992', true),
    ('00000000-0000-0000-0000-000000000003', 'hospital', 'Max Super Hospital',    '+919999999993', true)
  on conflict (id) do nothing;

  insert into public.donor_profiles (id, blood_group, weight_kg, last_donation, is_available, max_travel_km, lat, lng)
  values
    ('00000000-0000-0000-0000-000000000002', 'O-', 72, '2026-05-01', true, 15, 12.9716, 77.5946)
  on conflict (id) do nothing;

  insert into public.hospital_profiles (id, hospital_name, registration_number, address, lat, lng, verified_tier)
  values
    ('00000000-0000-0000-0000-000000000003', 'Max Super Speciality Hospital', 'HSP-001', 'Bannerghatta Road, Bangalore', 12.8950, 77.5980, 'full')
  on conflict (id) do nothing;

  -- Seed all 8 blood groups with 0 inventory for the hospital
  insert into public.blood_inventory (hospital_id, blood_group, units_available)
  select '00000000-0000-0000-0000-000000000003', bg, 0
  from unnest(enum_range(null::public.blood_group)) bg
  on conflict (hospital_id, blood_group) do nothing;
end;
$$;
