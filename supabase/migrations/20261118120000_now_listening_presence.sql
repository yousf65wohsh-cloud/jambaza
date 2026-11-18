-- =============================================================================
-- Jambaza — now-listening presence (missing schema)
-- =============================================================================
-- The presence feature shipped in ac1053b ("record now-listening presence when a
-- track starts") without its database objects, so `reportMyPresence` failed
-- silently and `list_friends_now_listening()` was never callable.
--
-- This migration adds them, additively:
--   1. `user_presence` — one row per listener holding their latest track.
--      Users may only write and read their own row; friends read presence
--      through the security-definer RPC below.
--   2. `list_friends_now_listening()` — accepted friends plus the track they
--      started. Security definer so the friend's profile and track metadata
--      (including unpublished uploads) stay visible without weakening the
--      `profiles` or `tracks` RLS policies.
--
-- No existing table, column, policy or function is changed.
-- =============================================================================

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  updated_at timestamptz not null default now()
);

comment on table public.user_presence is
  'Latest track each listener started. Friends read it through list_friends_now_listening().';

create index if not exists user_presence_updated_at_idx
  on public.user_presence (updated_at desc);

alter table public.user_presence enable row level security;

drop policy if exists "user_presence_select_own" on public.user_presence;
create policy "user_presence_select_own"
  on public.user_presence
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_presence_insert_own" on public.user_presence;
create policy "user_presence_insert_own"
  on public.user_presence
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_presence_update_own" on public.user_presence;
create policy "user_presence_update_own"
  on public.user_presence
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_presence_delete_own" on public.user_presence;
create policy "user_presence_delete_own"
  on public.user_presence
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- RLS still applies to these grants.
grant select, insert, update, delete on public.user_presence to authenticated;

-- -----------------------------------------------------------------------------
-- list_friends_now_listening()
-- Newest first. The client applies the ten-minute window (PRESENCE_TTL_MS) so
-- the staleness rule stays in one tested place.
-- -----------------------------------------------------------------------------
drop function if exists public.list_friends_now_listening();

create function public.list_friends_now_listening()
returns table (
  friend_id uuid,
  friend_username text,
  friend_display_name text,
  friend_avatar_url text,
  track_id uuid,
  track_title text,
  track_artist text,
  track_cover_url text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id as friend_id,
    p.username as friend_username,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    t.id as track_id,
    t.title as track_title,
    t.artist as track_artist,
    t.cover_url as track_cover_url,
    up.updated_at as updated_at
  from public.user_presence up
  join public.profiles p on p.id = up.user_id
  join public.tracks t on t.id = up.track_id
  where up.user_id <> (select auth.uid())
    and public.are_friends((select auth.uid()), up.user_id)
  order by up.updated_at desc;
$$;

comment on function public.list_friends_now_listening() is
  'Accepted friends'' latest presence row joined with their public profile and track metadata, newest first.';

revoke execute on function public.list_friends_now_listening() from public, anon;
grant execute on function public.list_friends_now_listening() to authenticated;
