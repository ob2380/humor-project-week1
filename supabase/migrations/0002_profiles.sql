-- Week 3 assignment: profiles table + auto-provisioning trigger.
--
-- Run this in the Supabase SQL editor (Project: humor-project-week1).
--
-- Per the assignment instructions, RLS can stay OFF on `profiles` for now.
-- (Access to this route is still gated by Proxy + a per-request auth check
-- in the app itself, not by RLS.)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS intentionally left off for this assignment (see note above).
alter table public.profiles disable row level security;

-- Auto-create a profile row the first time a user signs in, with first/last
-- name left null so the app can prompt them to fill it in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, null, null)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- Storage: a public bucket for avatar photos. We never store binary image
-- data in Postgres directly — only the public URL, in profiles.avatar_url.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can view avatars (bucket is public).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- A signed-in user may only upload/update/delete files inside their own
-- folder, named after their user id (e.g. "<user-id>/photo.jpg").
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
