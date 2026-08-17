alter table public.orbit_spaces
  add column if not exists icon_image_path text,
  add column if not exists background_image_path text,
  add column if not exists background_overlay numeric not null default 0.55;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orbit_spaces_background_overlay_check'
  ) then
    alter table public.orbit_spaces
      add constraint orbit_spaces_background_overlay_check
      check (background_overlay >= 0 and background_overlay <= 1);
  end if;
end $$;
