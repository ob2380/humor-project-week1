-- Week 6: let signed-in users post captions and memes for everyone to vote on.
--
-- Nothing here changes an existing table, policy, or bucket. It ADDS:
--   * public.community_posts  (a review queue: users submit, an admin approves)
--   * the "community-memes" storage bucket (users upload into their own folder)
-- When an admin approves a post, the app copies it into the existing
-- public.images / public.captions tables using the admin's own session (the
-- existing admin-only policies already allow that), so voting, Trending, New
-- and Top all keep working unchanged.

create table public.community_posts (
  id          bigint generated always as identity primary key,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('caption', 'meme')),
  caption_text text not null check (char_length(caption_text) between 1 and 200),
  -- Path inside the community-memes bucket. Required for memes, absent for captions.
  image_path  text,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  -- Set when an admin approves: the row created in public.captions.
  caption_id  bigint references public.captions(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint meme_has_image check ((kind = 'meme') = (image_path is not null))
);

create index community_posts_author_idx on public.community_posts (author_id);
create index community_posts_status_idx on public.community_posts (status, created_at);

alter table public.community_posts enable row level security;

-- Everyone sees approved posts; authors also see their own; admins see all.
create policy posts_read on public.community_posts
  for select to public
  using (status = 'approved' or author_id = auth.uid() or public.is_superadmin());

-- Users can only submit posts as themselves, and always start as pending.
create policy posts_insert_own on public.community_posts
  for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending' and caption_id is null);

-- Only admins review (approve or reject).
create policy posts_admin_update on public.community_posts
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Authors can withdraw their own posts until they are approved; admins can remove any.
create policy posts_delete on public.community_posts
  for delete to authenticated
  using ((author_id = auth.uid() and status <> 'approved') or public.is_superadmin());

-- Storage: one public bucket, JPEG/PNG/WEBP only, 4 MB max. Users may upload
-- and delete only inside a folder named after their own user id (same pattern
-- as the avatars bucket). No SELECT policy, so the bucket cannot be listed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-memes', 'community-memes', true, 4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy community_memes_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-memes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy community_memes_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-memes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin())
  );
