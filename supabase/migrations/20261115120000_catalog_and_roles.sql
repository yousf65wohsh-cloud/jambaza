-- =============================================================================
-- Jambaza — artist roles, published catalog, ratings and comments
-- =============================================================================
-- Builds the artist-based data model on top of 20261112000000_init.sql:
--
--   * public.profiles.role        listener | artist | admin (default listener)
--   * public.profiles.friend_code shareable 8-char code, unique, auto-generated
--   * public.tracks               description, credits, release_date, is_published
--   * public.track_ratings        one 1..5 rating per user per track
--   * public.track_comments       1..500 character comments
--   * public.is_artist_or_admin() helper for upload-related policies
--
-- Existing tables are extended with new columns only. No existing migration,
-- policy, grant, bucket or constraint is dropped or altered. Every new policy
-- is additive, so the current owner and playlist read paths keep working.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: role + friend code
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column role text not null default 'listener'
    constraint profiles_role_check
    check (role in ('listener', 'artist', 'admin')),
  add column friend_code text;

comment on column public.profiles.role is
  'Authorization role: listener (default), artist (may publish) or admin.';

comment on column public.profiles.friend_code is
  'Shareable 8-character uppercase alphanumeric code used to add friends. Generated automatically.';

-- Returns an unused friend code. SECURITY DEFINER so the collision check sees
-- every profile regardless of RLS. Bytes come from gen_random_uuid(), so codes
-- are well distributed across the full alphabet.
create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- 32 unambiguous uppercase alphanumerics (0/O and 1/I removed).
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  candidate text;
  attempts integer := 0;
begin
  loop
    random_bytes := decode(
      replace(gen_random_uuid()::text, '-', ''),
      'hex'
    );
    candidate := '';

    for i in 0..7 loop
      candidate := candidate
        || substr(alphabet, 1 + (get_byte(random_bytes, i) % 32), 1);
    end loop;

    exit when not exists (
      select 1
      from public.profiles p
      where p.friend_code = candidate
    );

    attempts := attempts + 1;
    if attempts >= 50 then
      raise exception 'could not generate a unique friend code';
    end if;
  end loop;

  return candidate;
end;
$$;

comment on function public.generate_friend_code() is
  'Returns an unused 8-character uppercase alphanumeric friend code.';

-- Backfill existing profiles one row at a time so every generated code is
-- checked against the rows written earlier in this migration.
do $$
declare
  target_id uuid;
begin
  for target_id in
    select p.id
    from public.profiles p
    where p.friend_code is null
  loop
    update public.profiles
       set friend_code = public.generate_friend_code()
     where id = target_id;
  end loop;
end;
$$;

alter table public.profiles
  alter column friend_code set default public.generate_friend_code(),
  alter column friend_code set not null,
  add constraint profiles_friend_code_key unique (friend_code),
  add constraint profiles_friend_code_format_check
    check (friend_code ~ '^[A-Z0-9]{8}$');

-- The existing "profiles_update_own" policy lets users update their own row,
-- which would also allow self-promotion to admin. Guard the role column
-- separately; admins (and trusted non-user contexts such as service role or
-- migrations, where auth.uid() is null) may still change it.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not exists (
       select 1
       from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
     )
  then
    raise exception 'only admins can change a profile role'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.guard_profile_role() is
  'Prevents authenticated non-admins from changing profiles.role.';

create trigger profiles_guard_role
  before update on public.profiles
  for each row
  execute function public.guard_profile_role();

-- -----------------------------------------------------------------------------
-- tracks: catalog metadata + published read policy
-- -----------------------------------------------------------------------------

alter table public.tracks
  add column description text,
  add column credits text,
  add column release_date date,
  add column is_published boolean not null default false;

comment on column public.tracks.is_published is
  'Published tracks are readable by every authenticated user in the catalog.';

-- Read-only addition: any authenticated user may browse published tracks.
-- Existing owner and playlist policies are untouched, so unpublished tracks
-- remain visible only through their current owner/playlist read paths.
create policy "tracks_select_published_catalog"
  on public.tracks
  for select
  to authenticated
  using (is_published = true);

create index tracks_published_created_at_idx
  on public.tracks (created_at desc)
  where is_published = true;

-- -----------------------------------------------------------------------------
-- track_ratings
-- -----------------------------------------------------------------------------

create table public.track_ratings (
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

comment on table public.track_ratings is
  'One 1..5 star rating per user per track.';

alter table public.track_ratings enable row level security;

create policy "track_ratings_select_authenticated"
  on public.track_ratings
  for select
  to authenticated
  using (true);

create policy "track_ratings_insert_own"
  on public.track_ratings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "track_ratings_update_own"
  on public.track_ratings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "track_ratings_delete_own"
  on public.track_ratings
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create index track_ratings_user_id_idx on public.track_ratings (user_id);

create trigger track_ratings_set_updated_at
  before update on public.track_ratings
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- track_comments
-- -----------------------------------------------------------------------------

create table public.track_comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.track_comments is
  'Timestamped comments on a track, readable by every authenticated user.';

alter table public.track_comments enable row level security;

create policy "track_comments_select_authenticated"
  on public.track_comments
  for select
  to authenticated
  using (true);

create policy "track_comments_insert_own"
  on public.track_comments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "track_comments_update_own"
  on public.track_comments
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "track_comments_delete_own"
  on public.track_comments
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create index track_comments_track_created_idx
  on public.track_comments (track_id, created_at desc);
create index track_comments_user_id_idx on public.track_comments (user_id);

create trigger track_comments_set_updated_at
  before update on public.track_comments
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: is_artist_or_admin(uuid)
-- -----------------------------------------------------------------------------

create or replace function public.is_artist_or_admin(
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role in ('artist', 'admin')
  );
$$;

comment on function public.is_artist_or_admin(uuid) is
  'True when the given profile may publish tracks (artist or admin). Intended for upload-related policies.';

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

-- The init migration granted table privileges only to the tables that existed
-- at the time; new tables need their own grants (RLS still applies on top).
grant select, insert, update, delete
  on public.track_ratings, public.track_comments
  to authenticated;

-- generate_friend_code() backs a column default, so any role allowed to insert
-- a profile needs EXECUTE. service_role is included for server-side tooling.
revoke all on function public.generate_friend_code() from public, anon;
grant execute on function public.generate_friend_code() to authenticated, service_role;

revoke all on function public.guard_profile_role() from public, anon;

revoke all on function public.is_artist_or_admin(uuid) from public, anon;
grant execute on function public.is_artist_or_admin(uuid) to authenticated;

-- =============================================================================
-- Manual verification (comments only — the migration does not run these)
-- =============================================================================
-- Run in the Supabase SQL editor after applying the migration.
--
-- 1) New columns exist with the expected shape
-- select table_name, column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('profiles', 'tracks')
--   and column_name in ('role', 'friend_code', 'description', 'credits',
--                       'release_date', 'is_published')
-- order by table_name, ordinal_position;
--
-- 2) Friend codes: one per profile, unique, 8 uppercase alphanumerics
-- select count(*) as profiles,
--        count(friend_code) as with_code,
--        count(*) filter (where friend_code ~ '^[A-Z0-9]{8}$') as valid_format,
--        count(distinct friend_code) as distinct_codes
-- from public.profiles;
-- -- expect: profiles = with_code = valid_format = distinct_codes
--
-- 3) Generator output
-- select public.generate_friend_code();
--
-- 4) Functions are security definer with an empty search_path
-- select p.proname,
--        p.prosecdef as security_definer,
--        p.proconfig as settings
-- from pg_proc p
-- where p.pronamespace = 'public'::regnamespace
--   and p.proname in ('generate_friend_code', 'is_artist_or_admin',
--                     'guard_profile_role');
-- -- expect: security_definer = true, settings = {search_path=}
--
-- 5) New policies and RLS coverage
-- select tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('tracks', 'track_ratings', 'track_comments')
-- order by tablename, policyname;
-- -- expect: 8 policies on the two new tables plus tracks_select_published_catalog
--
-- 6) Published catalog is readable; unpublished rows are not catalog-wide
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', '<USER_UUID>', 'role', 'authenticated')::text, true);
-- select id, title from public.tracks where is_published;      -- all published
-- select id, title from public.tracks where not is_published;  -- own/playlisted only
-- rollback;
--
-- 7) Ratings/comments: own writes allowed, other users' writes rejected
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', '<USER_UUID>', 'role', 'authenticated')::text, true);
-- insert into public.track_ratings (track_id, user_id, rating)
--   values ('<TRACK_UUID>', '<USER_UUID>', 5);
-- update public.track_ratings set rating = 4
--   where track_id = '<TRACK_UUID>' and user_id = '<USER_UUID>';
-- insert into public.track_ratings (track_id, user_id, rating)
--   values ('<TRACK_UUID>', '<OTHER_USER_UUID>', 5);          -- expect RLS violation
-- insert into public.track_comments (track_id, user_id, body)
--   values ('<TRACK_UUID>', '<USER_UUID>', '');               -- expect check violation
-- insert into public.track_comments (track_id, user_id, body)
--   values ('<TRACK_UUID>', '<USER_UUID>', repeat('x', 501)); -- expect check violation
-- rollback;
--
-- 8) Role guard: a listener cannot promote themselves
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', '<USER_UUID>', 'role', 'authenticated')::text, true);
-- update public.profiles set role = 'admin' where id = '<USER_UUID>';
-- -- expect: ERROR 42501 only admins can change a profile role
-- rollback;
-- =============================================================================
