-- =============================================================================
-- Jambaza — initial schema
-- =============================================================================
-- Creates all tables, enables RLS everywhere, adds policies, the signup
-- profile trigger, storage buckets (covers: public, audio: private), and
-- enables Realtime for listening_rooms.
--
-- Run with: supabase db push
-- (or paste into the Supabase SQL editor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public listener profile, one row per auth user.';

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artist text,
  cover_url text,
  audio_path text,
  duration_seconds integer,
  source_type text not null check (source_type in ('upload', 'youtube')),
  youtube_video_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracks_duration_non_negative check (
    duration_seconds is null or duration_seconds >= 0
  )
);

comment on table public.tracks is
  'A track owned by a user. Uploads live in the private audio bucket; YouTube tracks only store the video id.';

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  primary key (playlist_id, track_id)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- One friendship per pair, regardless of who asked first.
create unique index friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.listening_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  video_id text not null,
  is_playing boolean not null default false,
  position_seconds double precision not null default 0 check (position_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.listening_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Keep updated_at honest on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Security-definer helpers break RLS recursion between friendships, profiles,
-- playlists and rooms while only exposing a boolean.
create or replace function public.are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = p_user_a and f.addressee_id = p_user_b)
        or (f.addressee_id = p_user_a and f.requester_id = p_user_b)
      )
  );
$$;

create or replace function public.is_room_member(
  p_room_id uuid,
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
    from public.room_members m
    where m.room_id = p_room_id
      and m.user_id = p_user_id
  );
$$;

create or replace function public.is_room_host(
  p_room_id uuid,
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
    from public.listening_rooms r
    where r.id = p_room_id
      and r.host_id = p_user_id
  );
$$;

-- Creates the profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  desired_username text;
  desired_display_name text;
  desired_avatar_url text;
begin
  desired_username := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  desired_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'مستمع'), '@', 1)
  );
  desired_avatar_url := nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '');

  begin
    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, desired_username, desired_display_name, desired_avatar_url);
  exception
    when unique_violation then
      -- The requested username is taken: append a short, unique suffix so
      -- signup still succeeds.
      insert into public.profiles (id, username, display_name, avatar_url)
      values (
        new.id,
        desired_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
        desired_display_name,
        desired_avatar_url
      );
  end;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.friendships enable row level security;
alter table public.listening_rooms enable row level security;
alter table public.room_members enable row level security;

-- profiles: read your own profile and accepted friends' profiles; update only
-- your own. Inserts happen through the signup trigger (security definer).
create policy "profiles_select_self_or_friend"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.are_friends((select auth.uid()), id)
  );

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tracks: owners manage their own tracks. Tracks inside a playlist you can
-- see (your own, or a friend's public one) are readable.
create policy "tracks_owner_all"
  on public.tracks
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "tracks_select_visible_via_playlist"
  on public.tracks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.playlist_tracks pt
      join public.playlists p on p.id = pt.playlist_id
      where pt.track_id = tracks.id
    )
  );

-- playlists: owners manage their own; friends may read public playlists.
create policy "playlists_owner_all"
  on public.playlists
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "playlists_select_public_friends"
  on public.playlists
  for select
  to authenticated
  using (
    is_public
    and public.are_friends((select auth.uid()), owner_id)
  );

-- playlist_tracks: readable when the parent playlist is readable (the
-- playlists policy already filters owner + friends' public playlists);
-- writable only by the playlist owner.
create policy "playlist_tracks_select_visible_playlist"
  on public.playlist_tracks
  for select
  to authenticated
  using (
    exists (select 1 from public.playlists p where p.id = playlist_id)
  );

create policy "playlist_tracks_owner_write"
  on public.playlist_tracks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and p.owner_id = (select auth.uid())
    )
  );

-- friendships: participants can read; requesters create pending requests;
-- addressees accept them; either side can remove the relationship.
create policy "friendships_select_participants"
  on public.friendships
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

create policy "friendships_insert_requester"
  on public.friendships
  for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and addressee_id <> (select auth.uid())
    and status = 'pending'
  );

create policy "friendships_accept_addressee"
  on public.friendships
  for update
  to authenticated
  using (addressee_id = (select auth.uid()))
  with check (
    addressee_id = (select auth.uid())
    and status = 'accepted'
  );

create policy "friendships_delete_participants"
  on public.friendships
  for delete
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

-- listening_rooms: hosts write, room members read. Only the host may create,
-- update or delete a room.
create policy "listening_rooms_select_members"
  on public.listening_rooms
  for select
  to authenticated
  using (
    host_id = (select auth.uid())
    or public.is_room_member(id)
  );

create policy "listening_rooms_insert_host"
  on public.listening_rooms
  for insert
  to authenticated
  with check (host_id = (select auth.uid()));

create policy "listening_rooms_update_host"
  on public.listening_rooms
  for update
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "listening_rooms_delete_host"
  on public.listening_rooms
  for delete
  to authenticated
  using (host_id = (select auth.uid()));

-- room_members: members of a room can see its membership; users join as
-- themselves; hosts can add/remove members; members can leave.
create policy "room_members_select_members"
  on public.room_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_room_member(room_id)
    or public.is_room_host(room_id)
  );

create policy "room_members_insert_self_or_host"
  on public.room_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or public.is_room_host(room_id)
  );

create policy "room_members_delete_self_or_host"
  on public.room_members
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_room_host(room_id)
  );

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index tracks_owner_id_idx on public.tracks (owner_id);
create index tracks_source_type_idx on public.tracks (source_type);
create index playlists_owner_id_idx on public.playlists (owner_id);
create index playlist_tracks_track_id_idx on public.playlist_tracks (track_id);
create index friendships_requester_id_idx on public.friendships (requester_id);
create index friendships_addressee_id_idx on public.friendships (addressee_id);
create index friendships_status_idx on public.friendships (status);
create index listening_rooms_host_id_idx on public.listening_rooms (host_id);
create index room_members_user_id_idx on public.room_members (user_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger tracks_set_updated_at
  before update on public.tracks
  for each row
  execute function public.set_updated_at();

create trigger playlists_set_updated_at
  before update on public.playlists
  for each row
  execute function public.set_updated_at();

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row
  execute function public.set_updated_at();

create trigger listening_rooms_set_updated_at
  before update on public.listening_rooms
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Function permissions
-- -----------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public;
revoke all on function public.set_updated_at() from public;

revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.is_room_member(uuid, uuid) from public;
revoke all on function public.is_room_host(uuid, uuid) from public;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.is_room_member(uuid, uuid) to authenticated;
grant execute on function public.is_room_host(uuid, uuid) to authenticated;

-- RLS still applies to these grants.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('covers', 'covers', true),
  ('audio', 'audio', false)
on conflict (id) do update set public = excluded.public;

-- covers: public read, owner-only writes.
create policy "covers_public_read"
  on storage.objects
  for select
  using (bucket_id = 'covers');

create policy "covers_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'covers' and owner = (select auth.uid()));

create policy "covers_owner_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'covers' and owner = (select auth.uid()))
  with check (bucket_id = 'covers' and owner = (select auth.uid()));

create policy "covers_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'covers' and owner = (select auth.uid()));

-- audio: private. Only the owner can read or write. The player requests
-- short-lived signed URLs; nothing is exposed publicly.
create policy "audio_owner_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'audio' and owner = (select auth.uid()));

create policy "audio_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'audio' and owner = (select auth.uid()));

create policy "audio_owner_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'audio' and owner = (select auth.uid()))
  with check (bucket_id = 'audio' and owner = (select auth.uid()));

create policy "audio_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'audio' and owner = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------

alter table public.listening_rooms replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.listening_rooms;
exception
  when duplicate_object then null;
end;
$$;
