alter table public.space_widgets
  add column image_path text;

alter table public.space_widgets
  drop constraint space_widgets_widget_type_check,
  add constraint space_widgets_widget_type_check check (widget_type in ('sheet', 'image')),
  add constraint space_widgets_image_content check (
    (widget_type = 'image' and image_path is not null) or widget_type = 'sheet'
  );
