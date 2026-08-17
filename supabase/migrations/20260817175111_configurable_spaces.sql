create table public.orbit_spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'gacha', 'food', 'subscriptions', 'wishlist', 'clothing',
    'travel', 'sales', 'projects', 'inspiration'
  )),
  name text not null check (length(trim(name)) between 1 and 80),
  icon text not null check (icon in (
    'apple', 'folder-kanban', 'gamepad', 'heart', 'luggage',
    'repeat', 'shirt', 'sparkles', 'tag'
  )),
  is_prebuilt boolean not null default false,
  archived_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orbit_spaces_user_position_idx
  on public.orbit_spaces (user_id, position, created_at);
create unique index orbit_spaces_prebuilt_kind_key
  on public.orbit_spaces (user_id, kind)
  where is_prebuilt;

alter table public.orbit_spaces enable row level security;

create policy "Users manage their own Orbit spaces"
on public.orbit_spaces for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.orbit_spaces to authenticated;

create trigger set_orbit_spaces_updated_at
before update on public.orbit_spaces
for each row execute function private.set_updated_at();

insert into public.orbit_spaces (user_id, kind, name, icon, is_prebuilt, position)
select users.id, defaults.kind, defaults.name, defaults.icon, true, defaults.position
from auth.users as users
cross join (
  values
    ('gacha', 'Gacha', 'gamepad', 10),
    ('food', 'Comida', 'apple', 20),
    ('subscriptions', 'Suscripciones', 'repeat', 30),
    ('wishlist', 'Lista de deseos', 'heart', 40),
    ('clothing', 'Ropa', 'shirt', 50),
    ('travel', 'Viajes', 'luggage', 60),
    ('sales', 'Ventas', 'tag', 70),
    ('projects', 'Proyectos', 'folder-kanban', 80),
    ('inspiration', 'Inspiración', 'sparkles', 90)
) as defaults(kind, name, icon, position)
;

alter table public.space_preferences add column space_id uuid;
alter table public.space_widgets add column space_id uuid;
alter table public.orbit_spaces add constraint orbit_spaces_user_id_id_key unique (user_id, id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'gacha_games', 'gacha_events', 'farming_targets', 'food_items',
    'subscriptions', 'wishlist', 'clothing_items', 'travel_bags',
    'bag_items', 'sale_items', 'projects', 'inspiration'
  ]
  loop
    execute format('alter table public.%I add column space_id uuid', table_name);
    execute format(
      'update public.%1$I as item set space_id = space.id '
      'from public.orbit_spaces as space '
      'where space.user_id = item.user_id and space.kind = %2$L and space.is_prebuilt',
      table_name,
      case
        when table_name in ('gacha_games', 'gacha_events', 'farming_targets') then 'gacha'
        when table_name = 'food_items' then 'food'
        when table_name in ('travel_bags', 'bag_items') then 'travel'
        when table_name = 'sale_items' then 'sales'
        else replace(table_name, '_items', '')
      end
    );
    execute format('alter table public.%I alter column space_id set not null', table_name);
    execute format(
      'alter table public.%1$I add constraint %1$I_space_owner_fk '
      'foreign key (user_id, space_id) references public.orbit_spaces(user_id, id) on delete restrict',
      table_name
    );
    execute format('create index %1$I_user_space_idx on public.%1$I (user_id, space_id)', table_name);
  end loop;
end;
$$;

alter table public.gacha_games add constraint gacha_games_user_space_id_key unique (user_id, space_id, id);
alter table public.gacha_events add constraint gacha_events_user_space_id_key unique (user_id, space_id, id);
alter table public.travel_bags add constraint travel_bags_user_space_id_key unique (user_id, space_id, id);
alter table public.projects add constraint projects_user_space_id_key unique (user_id, space_id, id);

alter table public.gacha_events
  add constraint gacha_events_game_space_fk
  foreign key (user_id, space_id, game_id)
  references public.gacha_games(user_id, space_id, id)
  on delete cascade;
alter table public.farming_targets
  add constraint farming_targets_game_space_fk
  foreign key (user_id, space_id, game_id)
  references public.gacha_games(user_id, space_id, id)
  on delete cascade;
alter table public.farming_targets
  add constraint farming_targets_event_space_fk
  foreign key (user_id, space_id, event_id)
  references public.gacha_events(user_id, space_id, id)
  on delete set null (event_id);
alter table public.bag_items
  add constraint bag_items_space_fk
  foreign key (user_id, space_id, bag_id)
  references public.travel_bags(user_id, space_id, id)
  on delete cascade;
alter table public.inspiration
  add constraint inspiration_project_space_fk
  foreign key (user_id, space_id, project_id)
  references public.projects(user_id, space_id, id)
  on delete set null (project_id);

update public.space_preferences as preference
set space_id = space.id
from public.orbit_spaces as space
where space.user_id = preference.user_id
  and space.kind = preference.space_type
  and space.is_prebuilt;

update public.space_widgets as widget
set space_id = space.id
from public.orbit_spaces as space
where space.user_id = widget.user_id
  and space.kind = widget.space_type
  and space.is_prebuilt;

alter table public.space_preferences alter column space_id set not null;
alter table public.space_widgets alter column space_id set not null;

alter table public.space_preferences
  add constraint space_preferences_space_owner_fk
  foreign key (user_id, space_id) references public.orbit_spaces(user_id, id) on delete cascade;
alter table public.space_widgets
  add constraint space_widgets_space_owner_fk
  foreign key (user_id, space_id) references public.orbit_spaces(user_id, id) on delete cascade;

alter table public.space_preferences drop constraint space_preferences_user_id_space_type_key;
alter table public.space_preferences add constraint space_preferences_user_space_key unique (user_id, space_id);

create index space_preferences_user_space_idx on public.space_preferences (user_id, space_id);
drop index public.space_widgets_user_space_updated_idx;
create index space_widgets_user_space_updated_idx on public.space_widgets (user_id, space_id, updated_at desc);
