alter table public.orbit_spaces drop constraint if exists orbit_spaces_kind_check;
alter table public.orbit_spaces add constraint orbit_spaces_kind_check check (kind in (
  'gacha', 'food', 'subscriptions', 'wishlist', 'clothing',
  'travel', 'sales', 'projects', 'inspiration', 'jobs'
));

alter table public.orbit_spaces drop constraint if exists orbit_spaces_icon_check;
alter table public.orbit_spaces add constraint orbit_spaces_icon_check check (icon in (
  'apple', 'briefcase', 'folder-kanban', 'gamepad', 'heart', 'luggage',
  'repeat', 'shirt', 'sparkles', 'tag'
));

insert into public.orbit_spaces (user_id, kind, name, icon, is_prebuilt, position)
select users.id, 'jobs', 'Trabajo', 'briefcase', true, 75
from auth.users as users
where not exists (
  select 1 from public.orbit_spaces as space
  where space.user_id = users.id and space.kind = 'jobs' and space.is_prebuilt
);

alter table public.deadlines drop constraint if exists deadlines_space_type_check;
alter table public.deadlines add constraint deadlines_space_type_check check (
  space_type in ('gacha_event', 'food_item', 'subscription', 'orbit_item')
);

create table public.orbit_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id uuid references public.orbit_spaces(id) on delete cascade,
  parent_id uuid references public.orbit_items(id) on delete cascade,
  kind text not null check (kind in ('folder', 'list', 'check_item', 'note', 'image', 'link', 'countdown')),
  title text not null check (length(trim(title)) between 1 and 120),
  body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  cover_path text,
  image_path text,
  url text,
  og_title text,
  og_description text,
  og_image_path text,
  status text,
  price numeric,
  due_date timestamptz,
  checked boolean not null default false,
  sort_order integer not null default 0,
  position_x numeric(12, 2) not null default 144
    check (position_x between -1000000 and 1000000),
  position_y numeric(12, 2) not null default 96
    check (position_y between -1000000 and 1000000),
  width integer not null default 320 check (width between 160 and 900),
  height integer not null default 240 check (height between 80 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orbit_items_parent_not_self check (parent_id is distinct from id),
  constraint orbit_items_link_requires_url check (kind <> 'link' or url is not null),
  constraint orbit_items_countdown_requires_due check (kind <> 'countdown' or due_date is not null),
  constraint orbit_items_image_requires_path check (kind <> 'image' or image_path is not null),
  constraint orbit_items_check_item_requires_parent check (kind <> 'check_item' or parent_id is not null)
);

create index orbit_items_user_space_parent_idx
  on public.orbit_items (user_id, space_id, parent_id, sort_order);
create index orbit_items_user_home_idx
  on public.orbit_items (user_id, created_at)
  where space_id is null;

create or replace function private.orbit_item_parent_kind(target uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select kind from public.orbit_items where id = target;
$$;

create or replace function private.enforce_orbit_item_nesting()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_kind text;
  parent_parent uuid;
begin
  if new.parent_id is null then
    if new.kind = 'check_item' then
      raise exception 'check_item requires a parent';
    end if;
    return new;
  end if;

  select kind, parent_id into parent_kind, parent_parent
  from public.orbit_items
  where id = new.parent_id and user_id = new.user_id;

  if parent_kind is null then
    raise exception 'parent item not found';
  end if;

  if parent_kind = 'list' and new.kind <> 'check_item' then
    raise exception 'list can only contain check_item';
  end if;

  if parent_kind = 'folder' then
    if new.kind = 'folder' and parent_parent is not null then
      raise exception 'cannot nest a folder inside a subfolder';
    end if;
  elsif parent_kind <> 'list' then
    raise exception 'parent cannot have children';
  end if;

  return new;
end;
$$;

create trigger orbit_items_nesting
before insert or update of parent_id, kind on public.orbit_items
for each row execute function private.enforce_orbit_item_nesting();

create trigger set_orbit_items_updated_at
before update on public.orbit_items
for each row execute function private.set_updated_at();

alter table public.orbit_items enable row level security;

create policy "Users manage their own orbit items"
on public.orbit_items for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.orbit_items to authenticated;
