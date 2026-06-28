-- Jewells Photo Sessions starter schema
-- Run this in the Supabase SQL editor before using the app.

create extension if not exists pgcrypto;

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  client_email text,
  gallery_code text not null unique,
  active boolean not null default true,
  expires_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (gallery_id, photo_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  session_type text,
  preferred_date date,
  location text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists galleries_gallery_code_idx on public.galleries(gallery_code);
create index if not exists photos_gallery_id_idx on public.photos(gallery_id);
create index if not exists favorites_gallery_id_idx on public.favorites(gallery_id);
create index if not exists favorites_photo_id_idx on public.favorites(photo_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);

alter table public.galleries enable row level security;
alter table public.photos enable row level security;
alter table public.favorites enable row level security;
alter table public.orders enable row level security;

-- The app uses server-side API routes with SUPABASE_SERVICE_ROLE_KEY for gallery
-- management and private gallery reads. These locked-down policies keep direct
-- browser access from listing galleries or files through the anon key.
drop policy if exists "No direct gallery reads" on public.galleries;
drop policy if exists "No direct photo reads" on public.photos;
drop policy if exists "No direct favorite reads" on public.favorites;
drop policy if exists "No direct order reads" on public.orders;

create policy "No direct gallery reads"
  on public.galleries for select
  using (false);

create policy "No direct photo reads"
  on public.photos for select
  using (false);

create policy "No direct favorite reads"
  on public.favorites for select
  using (false);

create policy "No direct order reads"
  on public.orders for select
  using (false);

-- Storage bucket:
-- 1. In Supabase, create a private bucket named gallery-photos.
-- 2. Keep it private. The app generates short-lived signed URLs on the server.
-- 3. No public storage policy is required for this starter version.
