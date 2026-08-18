alter table public.wishlist add column if not exists image_path text;
alter table public.projects add column if not exists image_path text;
alter table public.inspiration add column if not exists image_path text;

comment on column public.wishlist.image_url is 'Legacy URL field; drop in Task 9.';
comment on column public.projects.image_url is 'Legacy URL field; drop in Task 9.';
comment on column public.inspiration.image_url is 'Legacy URL field; drop in Task 9.';

alter table public.inspiration drop constraint if exists inspiration_has_content_check;
alter table public.inspiration add constraint inspiration_has_content_check check (
  nullif(trim(title), '') is not null
  or image_url is not null
  or image_path is not null
  or source_url is not null
  or nullif(trim(note), '') is not null
);

alter table public.inspiration drop constraint if exists inspiration_sketch_source_check;
alter table public.inspiration add constraint inspiration_sketch_source_check check (
  source_type <> 'sketch' or image_url is not null or image_path is not null
);
