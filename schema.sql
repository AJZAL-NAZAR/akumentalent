-- Akumen Talent: run in Supabase > SQL Editor > New query > Run.
-- Safe to run again: it only creates or updates what is needed.

-- 0. Team allowlist. Only active members can sign in and see data.
create table if not exists team_members (
  email text primary key,
  name text,
  role text not null default 'trainer' check (role in ('admin', 'trainer')),
  active boolean not null default true,
  added_by text,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);
alter table team_members enable row level security;

create or replace function current_email() returns text
language sql stable set search_path = public as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where email = current_email() and active)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where email = current_email() and active and role = 'admin')
$$;

-- Called by the app right after Microsoft sign-in.
-- The very first person to sign in becomes the admin; after that only listed members get in.
create or replace function join_team(display_name text default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  me text := current_email();
  m team_members;
  first_member boolean := false;
begin
  if me = '' then return json_build_object('active', false); end if;
  lock table team_members in share row exclusive mode;
  if not exists (select 1 from team_members) then
    insert into team_members (email, name, role, active, added_by) values (me, display_name, 'admin', true, 'first sign-in');
    first_member := true;
  end if;
  update team_members set last_seen = now(), name = coalesce(nullif(display_name, ''), name)
    where email = me returning * into m;
  if m.email is null then return json_build_object('active', false, 'reason', 'not_member'); end if;
  return json_build_object('role', m.role, 'active', m.active, 'first', first_member,
    'reason', case when m.active then null else 'inactive' end);
end $$;
grant execute on function join_team(text) to authenticated;
revoke execute on function join_team(text) from anon, public;

drop policy if exists "members read team" on team_members;
drop policy if exists "admins add members" on team_members;
drop policy if exists "admins change members" on team_members;
drop policy if exists "admins remove members" on team_members;
create policy "members read team"    on team_members for select to authenticated using (is_member());
create policy "admins add members"   on team_members for insert to authenticated with check (is_admin());
create policy "admins change members" on team_members for update to authenticated using (is_admin()) with check (is_admin());
create policy "admins remove members" on team_members for delete to authenticated using (is_admin());

-- 1. Shared data (one row holds the whole tracker; rev prevents silent overwrites)
create table if not exists tracker (
  id int primary key,
  data jsonb not null default '{}',
  rev int not null default 0,
  updated_by text,
  updated_at timestamptz default now()
);
insert into tracker (id) values (1) on conflict do nothing;
alter table tracker enable row level security;
drop policy if exists "team read" on tracker;
drop policy if exists "team write" on tracker;
create policy "team read"  on tracker for select to authenticated using (is_member());
create policy "team write" on tracker for update to authenticated using (is_member()) with check (is_member());

-- Live updates for teammates
do $$ begin
  alter publication supabase_realtime add table tracker;
exception when duplicate_object then null;
end $$;

-- 2. Activity log (append-only: members can add and read entries, never edit or delete)
create table if not exists activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_email text not null,
  user_name text,
  action text not null,
  detail text not null default ''
);
alter table activity_log add column if not exists user_name text;
create index if not exists activity_log_created_idx on activity_log (created_at desc);
alter table activity_log enable row level security;
drop policy if exists "log read" on activity_log;
drop policy if exists "log insert" on activity_log;
create policy "log read"   on activity_log for select to authenticated using (is_member());
create policy "log insert" on activity_log for insert to authenticated
  with check (is_member() and lower(user_email) = current_email());

-- 3. Private storage for resume files (team members only)
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false) on conflict do nothing;
drop policy if exists "team files" on storage.objects;
create policy "team files" on storage.objects for all to authenticated
  using (bucket_id = 'resumes' and is_member()) with check (bucket_id = 'resumes' and is_member());

-- 4. Only signed-in users may call the helper functions
revoke execute on function public.is_member() from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.current_email() from anon, public;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_email() to authenticated;

-- 5. Only an admin can clear all student data (the app also hides the button from trainers)
create or replace function guard_tracker_clear() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_array_length(coalesce(old.data -> 'students', '[]'::jsonb)) > 0
     and jsonb_array_length(coalesce(new.data -> 'students', '[]'::jsonb)) = 0
     and not is_admin() then
    raise exception 'Only an admin can clear all data';
  end if;
  return new;
end $$;
drop trigger if exists tracker_clear_guard on tracker;
create trigger tracker_clear_guard before update on tracker for each row execute function guard_tracker_clear();
