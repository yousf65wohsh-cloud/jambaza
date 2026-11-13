-- =============================================================================
-- Jambaza — friends read functions
-- =============================================================================
-- The friends feature needs to:
--   1. find users by username before any friendship exists, and
--   2. show the counterpart's profile for pending requests.
--
-- The profiles RLS policy ("profiles_select_self_or_friend" in
-- 20261112000000_init.sql) intentionally only exposes your own profile and
-- accepted friends' profiles. Instead of weakening that policy, this migration
-- adds two narrow, read-only, security-definer functions that expose only the
-- four public profile columns and only for the rows the caller is allowed to
-- see. No table, column or existing policy is changed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- search_profiles(p_query text)
-- Case-insensitive prefix search by username, excluding the caller, max 20 rows.
-- LIKE wildcards in the input are escaped so "%" and "_" are matched literally.
-- -----------------------------------------------------------------------------
create or replace function public.search_profiles(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select btrim(coalesce(p_query, '')) as value
  ),
  p as (
    select
      replace(replace(replace(value, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        as like_pattern
    from q
    where value <> ''
  )
  select
    pr.id,
    pr.username,
    pr.display_name,
    pr.avatar_url
  from public.profiles pr
  join p on pr.username ilike p.like_pattern escape '\'
  where pr.id <> (select auth.uid())
  order by pr.username
  limit 20;
$$;

comment on function public.search_profiles(text) is
  'Username prefix search for the friends feature: id, username, display_name and avatar_url for up to 20 profiles, excluding the caller.';

revoke execute on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

-- -----------------------------------------------------------------------------
-- list_my_friendships()
-- Every friendship the caller participates in, with the other participant's
-- four public profile columns and a direction computed from the caller's side.
-- -----------------------------------------------------------------------------
create or replace function public.list_my_friendships()
returns table (
  friendship_id uuid,
  status text,
  direction text,
  friend_id uuid,
  friend_username text,
  friend_display_name text,
  friend_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id as friendship_id,
    f.status as status,
    case
      when f.status = 'accepted' then 'accepted'
      when f.addressee_id = (select auth.uid()) then 'incoming'
      else 'outgoing'
    end as direction,
    other_profile.id as friend_id,
    other_profile.username as friend_username,
    other_profile.display_name as friend_display_name,
    other_profile.avatar_url as friend_avatar_url,
    f.created_at as created_at
  from public.friendships f
  join public.profiles other_profile
    on other_profile.id = case
      when f.requester_id = (select auth.uid()) then f.addressee_id
      else f.requester_id
    end
  where f.requester_id = (select auth.uid())
     or f.addressee_id = (select auth.uid())
  order by f.created_at desc;
$$;

comment on function public.list_my_friendships() is
  'Friendships the caller participates in, joined with the other participant''s public profile fields.';

revoke execute on function public.list_my_friendships() from public, anon;
grant execute on function public.list_my_friendships() to authenticated;
