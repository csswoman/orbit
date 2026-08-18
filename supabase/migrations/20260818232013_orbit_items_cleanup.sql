drop table if exists public.bag_items;
drop table if exists public.travel_bags;
drop table if exists public.clothing_items;
drop table if exists public.sale_items;
drop table if exists public.space_widgets;
drop table if exists public.home_canvas_items;

drop view if exists public.resurface_items;

alter table public.inspiration drop constraint if exists inspiration_has_content_check;
alter table public.inspiration drop constraint if exists inspiration_sketch_source_check;

alter table public.wishlist drop column if exists image_url;
alter table public.projects drop column if exists image_url;
alter table public.inspiration drop column if exists image_url;

alter table public.inspiration add constraint inspiration_has_content_check check (
  nullif(trim(title), '') is not null
  or image_path is not null
  or source_url is not null
  or nullif(trim(note), '') is not null
);

alter table public.inspiration add constraint inspiration_sketch_source_check check (
  source_type <> 'sketch' or image_path is not null
);

create or replace view public.resurface_items
with (security_invoker = true)
as
  select id, user_id, 'project'::text as item_type, title, description as summary,
    image_path as image_url, color, last_viewed_at, created_at
  from public.projects where status <> 'done'
  union all
  select id, user_id, 'inspiration'::text, coalesce(nullif(trim(title), ''), 'Inspiración'),
    note, image_path, null::text, last_viewed_at, created_at
  from public.inspiration;

grant select on public.resurface_items to authenticated;
