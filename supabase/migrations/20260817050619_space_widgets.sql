alter table public.space_preferences
  add column canvas_layout text not null default 'free'
    check (canvas_layout in ('order', 'free')),
  add column canvas_theme text not null default 'aurora'
    check (canvas_theme in ('aurora', 'bubblegum', 'lime', 'lunar')),
  add column canvas_font text not null default 'grotesk'
    check (canvas_font in ('grotesk', 'soft', 'classic')),
  add column canvas_positions jsonb not null default '{}'::jsonb;

create table public.space_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_type text not null check (
    space_type in (
      'gacha', 'food', 'subscriptions', 'wishlist', 'clothing',
      'travel', 'sales', 'projects', 'inspiration'
    )
  ),
  widget_type text not null default 'sheet' check (widget_type in ('sheet')),
  title text not null default 'Nueva hoja' check (length(trim(title)) between 1 and 120),
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  position_x numeric(5, 2) not null default 12 check (position_x between 0 and 100),
  position_y numeric(5, 2) not null default 12 check (position_y between 0 and 100),
  width integer not null default 360 check (width between 260 and 720),
  height integer not null default 300 check (height between 220 and 900),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index space_widgets_user_space_updated_idx
  on public.space_widgets (user_id, space_type, updated_at desc);

alter table public.space_widgets enable row level security;

create policy "Users manage their own space widgets"
on public.space_widgets for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.space_widgets to authenticated;

create trigger set_space_widgets_updated_at
before update on public.space_widgets
for each row execute function private.set_updated_at();
