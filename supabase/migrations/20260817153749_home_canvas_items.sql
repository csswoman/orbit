create table public.home_canvas_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note', 'task', 'image')),
  content jsonb not null default '{}'::jsonb,
  image_path text,
  position_x numeric(5, 2) not null default 12 check (position_x between 0 and 92),
  position_y numeric(5, 2) not null default 12 check (position_y between 0 and 92),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_canvas_image_content check (
    (kind = 'image' and image_path is not null) or (kind <> 'image')
  )
);

create index home_canvas_items_user_updated_idx
  on public.home_canvas_items (user_id, updated_at desc);

alter table public.home_canvas_items enable row level security;

create policy "Users manage their own home canvas items"
on public.home_canvas_items for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.home_canvas_items to authenticated;

create trigger set_home_canvas_items_updated_at
before update on public.home_canvas_items
for each row execute function private.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orbit-canvas',
  'orbit-canvas',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their own Orbit canvas media"
on storage.objects for select to authenticated
using (bucket_id = 'orbit-canvas' and owner_id = (select auth.uid()::text));

create policy "Users upload their own Orbit canvas media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'orbit-canvas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users update their own Orbit canvas media"
on storage.objects for update to authenticated
using (bucket_id = 'orbit-canvas' and owner_id = (select auth.uid()::text))
with check (
  bucket_id = 'orbit-canvas'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users delete their own Orbit canvas media"
on storage.objects for delete to authenticated
using (bucket_id = 'orbit-canvas' and owner_id = (select auth.uid()::text));
