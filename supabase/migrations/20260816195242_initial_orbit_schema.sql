create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_type text not null check (space_type in ('gacha_event', 'food_item', 'subscription')),
  source_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  due_date timestamptz not null,
  is_recurring boolean not null default false,
  recurrence_rule text,
  image_url text,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  status text not null default 'active' check (status in ('active', 'done', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, space_type, source_id)
);

create table public.gacha_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  icon_url text,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.gacha_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  image_url text,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  starts_at timestamptz,
  ends_at timestamptz not null,
  type text not null check (type in ('banner', 'abyss', 'other')),
  is_recurring boolean not null default false,
  recurrence_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gacha_events_dates_check check (starts_at is null or starts_at <= ends_at),
  constraint gacha_events_game_owner_fk
    foreign key (user_id, game_id)
    references public.gacha_games(user_id, id)
    on delete cascade,
  unique (user_id, id),
  unique (user_id, game_id, id)
);

create table public.farming_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_id uuid not null,
  event_id uuid,
  name text not null check (length(trim(name)) > 0),
  image_url text,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  notes text,
  status text not null default 'farming' check (status in ('farming', 'done', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farming_targets_game_owner_fk
    foreign key (user_id, game_id)
    references public.gacha_games(user_id, id)
    on delete cascade,
  constraint farming_targets_event_owner_fk
    foreign key (user_id, game_id, event_id)
    references public.gacha_events(user_id, game_id, id)
    on delete set null (event_id)
);

create table public.event_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint event_completions_event_owner_fk
    foreign key (user_id, event_id)
    references public.gacha_events(user_id, id)
    on delete cascade
);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  quantity text,
  expires_at date not null,
  purchased_at date,
  image_url text,
  status text not null default 'active' check (status in ('active', 'consumed', 'expired')),
  restock_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_dates_check check (purchased_at is null or purchased_at <= expires_at)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text check (type is null or type in ('course', 'streaming', 'tool', 'other')),
  renews_at date,
  cost numeric(12, 2) check (cost is null or cost >= 0),
  is_recurring boolean not null default true,
  recurrence_rule text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  type text check (type is null or type in ('course', 'pdf', 'other')),
  image_url text,
  status text not null default 'quiero_ver'
    check (status in ('quiero_ver', 'viendo', 'completado', 'quiero_comprar', 'comprado')),
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (length(trim(category)) > 0),
  name text,
  image_url text,
  needs_replacement boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.travel_bags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  trip_name text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.bag_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bag_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  packed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bag_items_bag_owner_fk
    foreign key (user_id, bag_id)
    references public.travel_bags(user_id, id)
    on delete cascade
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  image_url text,
  price numeric(12, 2) check (price is null or price >= 0),
  status text not null default 'available' check (status in ('available', 'sold')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  status text not null default 'idea' check (status in ('idea', 'active', 'paused', 'done')),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  image_url text,
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.inspiration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid,
  title text,
  image_url text,
  source_url text,
  note text,
  tags text[] not null default '{}',
  source_type text not null default 'upload' check (source_type in ('upload', 'sketch', 'url')),
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspiration_project_owner_fk
    foreign key (user_id, project_id)
    references public.projects(user_id, id)
    on delete set null (project_id),
  constraint inspiration_has_content_check check (
    nullif(trim(title), '') is not null
    or image_url is not null
    or source_url is not null
    or nullif(trim(note), '') is not null
  ),
  constraint inspiration_url_source_check check (
    source_type <> 'url' or source_url is not null
  ),
  constraint inspiration_sketch_source_check check (
    source_type <> 'sketch' or image_url is not null
  )
);

create table public.user_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  accent_color text not null default '#4F46E5'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  background_color text not null default '#FAFAFA'
    check (background_color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  surface_color text not null default '#FFFFFF'
    check (surface_color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  text_color text not null default '#18181B'
    check (text_color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'),
  dashboard_background_path text,
  dashboard_overlay numeric(3, 2) not null default 0.65
    check (dashboard_overlay between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_type text not null check (
    space_type in (
      'gacha', 'food', 'subscriptions', 'wishlist', 'clothing',
      'travel', 'sales', 'projects', 'inspiration'
    )
  ),
  visible_columns text[] not null default '{}',
  column_order text[] not null default '{}',
  sort_by text,
  sort_direction text not null default 'asc' check (sort_direction in ('asc', 'desc')),
  table_density text not null default 'comfortable'
    check (table_density in ('compact', 'comfortable')),
  accent_color text check (
    accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, space_type)
);

create index deadlines_upcoming_idx
  on public.deadlines (user_id, due_date)
  where status = 'active';
create index gacha_games_user_idx on public.gacha_games (user_id);
create index gacha_events_user_game_idx on public.gacha_events (user_id, game_id);
create index farming_targets_user_game_idx on public.farming_targets (user_id, game_id);
create index farming_targets_event_idx on public.farming_targets (event_id) where event_id is not null;
create index event_completions_user_event_idx on public.event_completions (user_id, event_id);
create index food_items_user_expiry_idx on public.food_items (user_id, expires_at);
create index subscriptions_user_renewal_idx on public.subscriptions (user_id, renews_at);
create index wishlist_user_idx on public.wishlist (user_id);
create index clothing_items_user_idx on public.clothing_items (user_id);
create index travel_bags_user_idx on public.travel_bags (user_id);
create index bag_items_user_bag_idx on public.bag_items (user_id, bag_id);
create index sale_items_user_idx on public.sale_items (user_id);
create index projects_resurface_idx on public.projects (user_id, last_viewed_at);
create index inspiration_resurface_idx on public.inspiration (user_id, last_viewed_at);
create index inspiration_project_idx on public.inspiration (project_id) where project_id is not null;
create index space_preferences_user_idx on public.space_preferences (user_id);

create or replace function private.sync_gacha_event_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.deadlines
    where user_id = old.user_id
      and space_type = 'gacha_event'
      and source_id = old.id;
    return old;
  end if;

  insert into public.deadlines (
    user_id, space_type, source_id, title, due_date, is_recurring,
    recurrence_rule, image_url, color, status
  )
  values (
    new.user_id, 'gacha_event', new.id, new.title, new.ends_at,
    new.is_recurring, new.recurrence_rule, new.image_url, new.color, 'active'
  )
  on conflict (user_id, space_type, source_id) do update set
    title = excluded.title,
    due_date = excluded.due_date,
    is_recurring = excluded.is_recurring,
    recurrence_rule = excluded.recurrence_rule,
    image_url = excluded.image_url,
    color = excluded.color,
    status = excluded.status;

  return new;
end;
$$;

create or replace function private.sync_food_item_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.deadlines
    where user_id = old.user_id
      and space_type = 'food_item'
      and source_id = old.id;
    return old;
  end if;

  insert into public.deadlines (
    user_id, space_type, source_id, title, due_date, is_recurring,
    image_url, status
  )
  values (
    new.user_id,
    'food_item',
    new.id,
    new.name,
    (new.expires_at + time '23:59:59') at time zone 'America/Lima',
    false,
    new.image_url,
    case when new.status = 'active' then 'active' else 'done' end
  )
  on conflict (user_id, space_type, source_id) do update set
    title = excluded.title,
    due_date = excluded.due_date,
    is_recurring = excluded.is_recurring,
    recurrence_rule = null,
    image_url = excluded.image_url,
    color = null,
    status = excluded.status;

  return new;
end;
$$;

create or replace function private.sync_subscription_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.deadlines
    where user_id = old.user_id
      and space_type = 'subscription'
      and source_id = old.id;
    return old;
  end if;

  if new.renews_at is null then
    delete from public.deadlines
    where user_id = new.user_id
      and space_type = 'subscription'
      and source_id = new.id;
    return new;
  end if;

  insert into public.deadlines (
    user_id, space_type, source_id, title, due_date, is_recurring,
    recurrence_rule, status
  )
  values (
    new.user_id,
    'subscription',
    new.id,
    new.name,
    (new.renews_at + time '09:00:00') at time zone 'America/Lima',
    new.is_recurring,
    new.recurrence_rule,
    case when new.status = 'active' then 'active' else 'dismissed' end
  )
  on conflict (user_id, space_type, source_id) do update set
    title = excluded.title,
    due_date = excluded.due_date,
    is_recurring = excluded.is_recurring,
    recurrence_rule = excluded.recurrence_rule,
    image_url = null,
    color = null,
    status = excluded.status;

  return new;
end;
$$;

create trigger sync_gacha_event_deadline
after insert or update or delete on public.gacha_events
for each row execute function private.sync_gacha_event_deadline();

create trigger sync_food_item_deadline
after insert or update or delete on public.food_items
for each row execute function private.sync_food_item_deadline();

create trigger sync_subscription_deadline
after insert or update or delete on public.subscriptions
for each row execute function private.sync_subscription_deadline();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'deadlines', 'gacha_games', 'gacha_events', 'farming_targets',
    'food_items', 'subscriptions', 'wishlist', 'clothing_items',
    'travel_bags', 'bag_items', 'sale_items', 'projects', 'inspiration',
    'user_preferences', 'space_preferences'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create view public.resurface_items
with (security_invoker = true)
as
  select
    id,
    user_id,
    'project'::text as item_type,
    title,
    description as summary,
    image_url,
    color,
    last_viewed_at,
    created_at
  from public.projects
  where status <> 'done'
  union all
  select
    id,
    user_id,
    'inspiration'::text as item_type,
    coalesce(nullif(trim(title), ''), 'Inspiración') as title,
    note as summary,
    image_url,
    null::text as color,
    last_viewed_at,
    created_at
  from public.inspiration;

grant usage on schema public to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'deadlines', 'gacha_games', 'gacha_events', 'farming_targets',
    'event_completions', 'food_items', 'subscriptions', 'wishlist',
    'clothing_items', 'travel_bags', 'bag_items', 'sale_items',
    'projects', 'inspiration', 'user_preferences', 'space_preferences'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy "Users manage their own rows" on public.%I '
      'for all to authenticated '
      'using ((select auth.uid()) = user_id) '
      'with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );
  end loop;
end;
$$;

grant select on public.resurface_items to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'orbit-backgrounds',
  'orbit-backgrounds',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their own Orbit backgrounds"
on storage.objects for select
to authenticated
using (
  bucket_id = 'orbit-backgrounds'
  and owner_id = (select auth.uid()::text)
);

create policy "Users upload their own Orbit backgrounds"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'orbit-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users update their own Orbit backgrounds"
on storage.objects for update
to authenticated
using (
  bucket_id = 'orbit-backgrounds'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'orbit-backgrounds'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users delete their own Orbit backgrounds"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'orbit-backgrounds'
  and owner_id = (select auth.uid()::text)
);

revoke all on function private.set_updated_at() from public;
revoke all on function private.sync_gacha_event_deadline() from public;
revoke all on function private.sync_food_item_deadline() from public;
revoke all on function private.sync_subscription_deadline() from public;
