-- Run this once in your Supabase project's SQL Editor.

create table if not exists kv_store (
  key text not null,
  shared boolean not null default false,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (key, shared)
);

alter table kv_store enable row level security;

-- Helper to fetch current user's role
create or replace function public.get_current_user_role()
returns text
language sql security definer
set search_path = public
as $$
  select role from public.user_roles
  where email = auth.email() and active = true;
$$;

-- Compare inventory costs to assert no unauthorized tampering of cost fields by Admin
create or replace function public.check_inventory_costs_unchanged(old_val text, new_val text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  old_json jsonb;
  new_json jsonb;
  old_car jsonb;
  new_car jsonb;
  car_id text;
begin
  begin
    old_json := old_val::jsonb;
    new_json := new_val::jsonb;
  exception when others then
    return false;
  end;

  if jsonb_typeof(old_json) <> 'array' or jsonb_typeof(new_json) <> 'array' then
    return false;
  end if;

  for new_car in select * from jsonb_array_elements(new_json) loop
    car_id := new_car ->> 'id';
    if car_id is not null then
      select value into old_car from jsonb_array_elements(old_json) as value where value ->> 'id' = car_id;
      if old_car is not null then
        if coalesce(old_car ->> 'purchaseCost', '') <> coalesce(new_car ->> 'purchaseCost', '') or
           coalesce(old_car -> 'expenses', '[]'::jsonb) <> coalesce(new_car -> 'expenses', '[]'::jsonb) then
          return false;
        end if;
      else
        -- Admin cannot create new cars
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

-- Enforce security policies dynamically inside a database trigger
create or replace function public.enforce_kv_store_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  ref_row kv_store;
begin
  user_role := public.get_current_user_role();
  
  if TG_OP = 'DELETE' then
    ref_row := OLD;
  else
    ref_row := NEW;
  end if;

  -- Master role enjoys full access controls
  if user_role = 'master' then
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;

  if user_role is null then
    raise exception 'Access denied: Unauthenticated session / missing role mapping.';
  end if;

  -- Sales Staff permissions checks
  if user_role = 'sales_staff' then
    if ref_row.key in ('inventory', 'staff', 'integrations', 'branding') then
      raise exception 'Access denied: Sales Staff cannot modify %.', ref_row.key;
    end if;
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;

  -- Admin permissions checks
  if user_role = 'admin' then
    if TG_OP = 'UPDATE' and ref_row.key = 'inventory' then
      if not public.check_inventory_costs_unchanged(OLD.value, NEW.value) then
        raise exception 'Access denied: Admin cannot modify cost or margin fields.';
      end if;
    elsif ref_row.key in ('integrations', 'branding') then
      raise exception 'Access denied: Admin cannot modify %.', ref_row.key;
    end if;
    
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;

  raise exception 'Access denied: Unrecognized session role.';
end;
$$;

-- Attach trigger
drop trigger if exists enforce_kv_store_security_trig on kv_store;
create trigger enforce_kv_store_security_trig
  before insert or update or delete
  on kv_store
  for each row
  execute function public.enforce_kv_store_security();

-- Drop old policies to prevent duplicates
drop policy if exists "public can read shared rows" on kv_store;
drop policy if exists "staff can write" on kv_store;
drop policy if exists "staff can update" on kv_store;
drop policy if exists "staff can delete" on kv_store;
drop policy if exists "public_read_kv" on kv_store;
drop policy if exists "staff_write_kv" on kv_store;
drop policy if exists "staff_update_kv" on kv_store;
drop policy if exists "staff_delete_kv" on kv_store;

-- Define clean role-based RLS on kv_store
create policy "public_read_kv" on kv_store for select
  using (shared = true or (auth.role() = 'authenticated' and get_current_user_role() is not null));

create policy "staff_write_kv" on kv_store for insert
  with check (auth.role() = 'authenticated' and get_current_user_role() is not null);

create policy "staff_update_kv" on kv_store for update
  using (auth.role() = 'authenticated' and get_current_user_role() is not null);

create policy "staff_delete_kv" on kv_store for delete
  using (auth.role() = 'authenticated' and get_current_user_role() is not null);


-- User Roles mapping table for RBAC.
create table if not exists user_roles (
  email text primary key,
  role text not null,
  active boolean not null default true,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  id uuid
);

alter table user_roles add column if not exists id uuid;

alter table user_roles enable row level security;

-- Drop old policies to prevent duplicates
drop policy if exists "authenticated users can read roles" on user_roles;
drop policy if exists "authenticated users can write roles" on user_roles;
drop policy if exists "authenticated users can update roles" on user_roles;
drop policy if exists "authenticated users can delete roles" on user_roles;
drop policy if exists "authenticated read roles" on user_roles;
drop policy if exists "only master write roles" on user_roles;
drop policy if exists "only master update roles" on user_roles;
drop policy if exists "only master delete roles" on user_roles;

-- Rebuild User Roles Policies
create policy "authenticated read roles" on user_roles for select
  using (auth.role() = 'authenticated');

create policy "only master write roles" on user_roles for insert
  with check (get_current_user_role() = 'master');

create policy "only master update roles" on user_roles for update
  using (get_current_user_role() = 'master');

create policy "only master delete roles" on user_roles for delete
  using (get_current_user_role() = 'master');

-- Grant permissions explicitly
grant all privileges on table kv_store to postgres, anon, authenticated, service_role;
grant all privileges on table user_roles to postgres, anon, authenticated, service_role;

