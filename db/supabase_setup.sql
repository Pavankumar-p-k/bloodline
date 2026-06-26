-- Core profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text check (role in ('donor','hospital','admin')) not null default 'donor',
  name text,
  phone text,
  city text,
  is_suspended boolean default false,
  created_at timestamp with time zone default now()
);

-- Profiles trigger setup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, name)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'donor'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enable RLS on profiles
alter table if exists public.profiles enable row level security;

create policy "Select own profile" on public.profiles
  for select using ( auth.uid() = id );

create policy "Update own profile" on public.profiles
  for update using ( auth.uid() = id ) with check ( auth.uid() = id );

create policy "Insert own profile" on public.profiles
  for insert with check ( auth.uid() = id );

create policy "Admin access all profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Donors details table (city precision location only)
create table if not exists public.donors (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  age integer check (age >= 18 and age <= 65),
  gender text not null,
  phone text not null,
  blood_group text not null check (blood_group in ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  city text not null,
  area text not null,
  lat double precision, -- approximate lat
  lng double precision, -- approximate lng
  last_donation_date date,
  is_available boolean default true,
  available_after timestamp with time zone,
  max_travel_km integer default 10,
  is_verified boolean default false,
  is_suspended boolean default false,
  created_at timestamp with time zone default now()
);

alter table if exists public.donors enable row level security;

create policy "Anyone can view donor basic info" on public.donors
  for select using ( true );

create policy "Donors can manage own record" on public.donors
  for all using ( auth.uid() = id );

create policy "Admin manage all donors" on public.donors
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Blood requests table
create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  requester_type text check (requester_type in ('Hospital', 'Patient Family', 'Clinic', 'Blood Bank')) not null,
  patient_name text,
  blood_group_needed text not null check (blood_group_needed in ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  units_needed integer not null check (units_needed between 1 and 10),
  urgency_level text check (urgency_level in ('CRITICAL', 'URGENT', 'PLANNED')) not null,
  hospital_name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  contact_name text not null,
  contact_phone text not null,
  status text not null check (status in ('pending', 'active', 'fulfilled', 'closed', 'fake')) default 'pending',
  verification_doc_url text,
  is_verified boolean default false,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

alter table if exists public.blood_requests enable row level security;

create policy "Anyone can view blood requests" on public.blood_requests
  for select using ( true );

create policy "Authenticated users can create requests" on public.blood_requests
  for insert with check ( auth.uid() is not null );

create policy "Requesters can update own requests" on public.blood_requests
  for update using ( auth.uid() = requester_id );

create policy "Admin manage all requests" on public.blood_requests
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Donor responses table
create table if not exists public.donor_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.blood_requests(id) on delete cascade not null,
  donor_id uuid references public.donors(id) on delete cascade not null,
  status text not null check (status in ('interested', 'confirmed', 'donated', 'cancelled')) default 'interested',
  responded_at timestamp with time zone default now(),
  donated_at timestamp with time zone,
  unique(request_id, donor_id)
);

alter table if exists public.donor_responses enable row level security;

create policy "Anyone can see response count or status" on public.donor_responses
  for select using ( true );

create policy "Donors can manage own responses" on public.donor_responses
  for all using ( auth.uid() = donor_id );

create policy "Requesters can view responses for their requests" on public.donor_responses
  for select using (
    exists (
      select 1 from public.blood_requests 
      where id = request_id and requester_id = auth.uid()
    )
  );

create policy "Admin manage all responses" on public.donor_responses
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Donations table
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.donors(id) on delete cascade not null,
  request_id uuid references public.blood_requests(id) on delete set null,
  donation_date date not null default current_date,
  units_donated integer not null check (units_donated > 0) default 1,
  hospital_name text not null,
  certificate_url text,
  created_at timestamp with time zone default now()
);

alter table if exists public.donations enable row level security;

create policy "Donors can view own donations" on public.donations
  for select using ( auth.uid() = donor_id );

create policy "Admin manage all donations" on public.donations
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.donors(id) on delete cascade not null,
  request_id uuid references public.blood_requests(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean default false,
  sent_at timestamp with time zone default now()
);

alter table if exists public.notifications enable row level security;

create policy "Donors can manage own notifications" on public.notifications
  for all using ( auth.uid() = donor_id );

-- User live locations table (for matching and map views)
create table if not exists public.user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamp with time zone default now()
);

alter table if exists public.user_locations enable row level security;

create policy "Anyone can view locations" on public.user_locations
  for select using ( true );

create policy "Users can upsert own location" on public.user_locations
  for insert with check ( auth.uid() = user_id );

create policy "Users can update own location" on public.user_locations
  for update using ( auth.uid() = user_id );

create policy "Users can delete own location" on public.user_locations
  for delete using ( auth.uid() = user_id );
