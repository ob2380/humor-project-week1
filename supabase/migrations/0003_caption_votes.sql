-- Week 4 assignment: caption_votes table (mutating data).
--
-- Applied to Supabase project humor-project-week1.
--
-- One row per (caption, voter). vote_value is +1 (upvote) or -1 (downvote).
--
-- Per the assignment ("do not update/enable/disable any RLS policies"), this
-- migration contains NO RLS statements. Only signed-in users can vote because
-- the Server Action re-checks auth itself before inserting, and it always
-- writes the voter's own id as profile_id.

create table if not exists public.caption_votes (
  id bigint generated always as identity primary key,
  caption_id bigint not null references public.captions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  vote_value smallint not null check (vote_value in (1, -1)),
  created_at timestamptz not null default now(),
  constraint caption_votes_one_per_user unique (caption_id, profile_id)
);
