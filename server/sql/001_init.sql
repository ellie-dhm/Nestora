create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'buyer'
    check (role in ('buyer','agent','admin')),
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  price integer not null check (price > 0),
  type text not null check (type in ('apartment','house','studio')),
  listing_type text not null check (listing_type in ('sale','rent')),
  bedrooms integer not null check (bedrooms >= 0),
  bathrooms integer not null check (bathrooms >= 0),
  city text not null,
  status text not null default 'available'
    check (status in ('available','sold','rented')),
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  status text not null default 'new'
    check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);

create index on properties (city, price);
create index on inquiries (property_id);

-- Block Supabase's public REST API; the server connects directly and bypasses RLS
alter table users enable row level security;
alter table properties enable row level security;
alter table inquiries enable row level security;