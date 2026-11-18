-- =============================================================================
-- Jambaza — listening-room invites (consent before joining)
-- =============================================================================
-- A friend must agree before becoming a room member, and `room_members` has no
-- pending state. Invitations therefore live in their own table:
--
--   1. The host creates the room, joins it, and inserts a `pending` invite.
--      The invitee is NOT a member yet and cannot read the room.
--   2. The invitee accepts — inserting their own `room_members` row, which the
--      existing "room_members_insert_self_or_host" policy already allows — and
--      the invite becomes `accepted`. Declining only updates the invite.
--
-- Additive only: no existing table, policy or function is altered.
-- =============================================================================

create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.listening_rooms (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint room_invites_no_self check (inviter_id <> invitee_id)
);

comment on table public.room_invites is
  'Consent gate for listening rooms: the invitee joins room_members only after accepting.';

-- One outstanding invitation per friend per room; responded invites stay as history.
create unique index room_invites_pending_unique
  on public.room_invites (room_id, invitee_id)
  where status = 'pending';

create index room_invites_invitee_idx on public.room_invites (invitee_id);

alter table public.room_invites enable row level security;

create policy "room_invites_select_participants"
  on public.room_invites
  for select
  to authenticated
  using (
    inviter_id = (select auth.uid())
    or invitee_id = (select auth.uid())
  );

-- Only the host of the room may invite, and only as themselves.
create policy "room_invites_insert_host"
  on public.room_invites
  for insert
  to authenticated
  with check (
    inviter_id = (select auth.uid())
    and status = 'pending'
    and public.is_room_host(room_id)
  );

-- Only the invitee may answer, and only once, from `pending` to a final state.
create policy "room_invites_update_invitee"
  on public.room_invites
  for update
  to authenticated
  using (
    invitee_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    invitee_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

-- The host may withdraw an invitation before it is answered.
create policy "room_invites_delete_inviter"
  on public.room_invites
  for delete
  to authenticated
  using (inviter_id = (select auth.uid()));

grant select, insert, update, delete on public.room_invites to authenticated;
