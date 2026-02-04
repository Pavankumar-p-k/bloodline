-- SQL schema for BloodLine emergency system

-- users table (store auth user id + email + role)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('donor','hospital','admin')),
  created_at timestamptz DEFAULT now()
);

-- profiles table (already expected by frontend/backend)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('donor','hospital','admin')),
  name text,
  phone text,
  blood_group text,
  city text,
  age integer,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  name text,
  license_number text,
  address text,
  city text,
  contact_phone text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Blood inventory table
CREATE TABLE IF NOT EXISTS blood_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE,
  blood_group text NOT NULL,
  units integer NOT NULL CHECK (units >= 0),
  expiry_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Emergency requests
CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  blood_group text NOT NULL,
  units integer NOT NULL CHECK (units > 0),
  city text NOT NULL,
  urgency_level text NOT NULL CHECK (urgency_level IN ('low','medium','critical')),
  status text NOT NULL CHECK (status IN ('pending','accepted','fulfilled','cancelled')) DEFAULT 'pending',
  accepted_hospital_id uuid REFERENCES hospitals(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_emergency_city_urgency ON emergency_requests (city, urgency_level DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_hospital_blood ON blood_inventory (hospital_id, blood_group);

-- Function to safely fulfill an emergency request
create or replace function fulfill_emergency_request(
    request_id uuid
)
returns jsonb
language plpgsql
as $$
declare
    req emergency_requests%rowtype;
    inventory blood_inventory%rowtype;
begin
    -- Fetch the request
    select * into req from emergency_requests where id = request_id for update;

    if not found then
        return jsonb_build_object('success', false, 'message', 'Request not found');
    end if;

    if req.status <> 'pending' then
        return jsonb_build_object('success', false, 'message', 'Request already processed');
    end if;

    -- Find matching inventory
    select * into inventory
    from blood_inventory
    where hospital_id = req.accepted_hospital_id
      and blood_group = req.blood_group
      and units >= req.units
      and expiry_date >= current_date
    for update;

    if not found then
        return jsonb_build_object('success', false, 'message', 'Insufficient blood units in inventory');
    end if;

    -- Deduct units atomically
    update blood_inventory
    set units = units - req.units
    where id = inventory.id;

    -- Update request status
    update emergency_requests
    set status = 'fulfilled'
    where id = req.id;

    return jsonb_build_object('success', true, 'message', 'Request fulfilled successfully');
end;
$$;