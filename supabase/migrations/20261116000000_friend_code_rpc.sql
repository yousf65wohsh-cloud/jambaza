-- =============================================================================
-- Jambaza — friend-code lookup and regeneration
-- =============================================================================
-- The friends feature can add people by their shareable 8-character friend
-- code, which already exists on public.profiles (20261115120000_catalog_and_roles.sql).
--
-- The profiles RLS policy only exposes your own profile and accepted friends'
-- profiles, so a direct select cannot find a stranger by code. This migration
-- adds two narrow security-definer functions:
--
--   * find_profile_by_friend_code(p_code) — reads the four public profile
--     columns for an exact code match.
--   * regenerate_my_friend_code() — replaces the caller's code with a fresh,
--     unused one using the existing generate_friend_code() helper.
--
-- No table, column or existing policy is modified.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- find_profile_by_friend_code(p_code text)
-- Codes are stored uppercase; input is trimmed and uppercased for convenience.
-- Returns at most one row and only the four public profile columns.
-- -----------------------------------------------------------------------------
create or replace function public.find_profile_by_friend_code(p_code text)
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
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url
  from public.profiles p
  where p.friend_code = upper(btrim(coalesce(p_code, '')))
  limit 1;
$$;

comment on function public.find_profile_by_friend_code(text) is
  'Looks up the four public profile fields for an exact 8-character friend code. Used before any friendship exists.';

revoke execute on function public.find_profile_by_friend_code(text) from public, anon;
grant execute on function public.find_profile_by_friend_code(text) to authenticated;

-- -----------------------------------------------------------------------------
-- regenerate_my_friend_code()
-- Atomically generates a new unused code and writes it to the caller's profile.
-- The old code stops working immediately. The profile update passes the
-- existing profiles_update_own RLS policy and the role guard trigger.
-- -----------------------------------------------------------------------------
create or replace function public.regenerate_my_friend_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  new_code := public.generate_friend_code();

  update public.profiles
     set friend_code = new_code
   where id = auth.uid();

  return new_code;
end;
$$;

comment on function public.regenerate_my_friend_code() is
  'Replaces the caller''s profile friend code with a fresh unused code and returns it.';

revoke execute on function public.regenerate_my_friend_code() from public, anon;
grant execute on function public.regenerate_my_friend_code() to authenticated;
