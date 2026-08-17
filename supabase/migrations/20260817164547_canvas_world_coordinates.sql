-- Canvas coordinates are pixels in an unbounded world, rather than percentages
-- inside the current browser viewport. Preserve the existing visual placement.
alter table public.space_widgets
  drop constraint space_widgets_position_x_check,
  drop constraint space_widgets_position_y_check,
  alter column position_x type numeric(12, 2) using position_x * 12,
  alter column position_y type numeric(12, 2) using position_y * 8,
  alter column position_x set default 144,
  alter column position_y set default 96,
  add constraint space_widgets_position_x_check check (position_x between -1000000 and 1000000),
  add constraint space_widgets_position_y_check check (position_y between -1000000 and 1000000);

alter table public.home_canvas_items
  drop constraint home_canvas_items_position_x_check,
  drop constraint home_canvas_items_position_y_check,
  alter column position_x type numeric(12, 2) using position_x * 12,
  alter column position_y type numeric(12, 2) using position_y * 8,
  alter column position_x set default 144,
  alter column position_y set default 96,
  add constraint home_canvas_items_position_x_check check (position_x between -1000000 and 1000000),
  add constraint home_canvas_items_position_y_check check (position_y between -1000000 and 1000000);

update public.space_preferences
set canvas_positions = coalesce((
  select jsonb_object_agg(
    key,
    jsonb_build_object(
      'x', round((value ->> 'x')::numeric * 12, 2),
      'y', round((value ->> 'y')::numeric * 8, 2)
    )
  )
  from jsonb_each(canvas_positions)
), '{}'::jsonb);
