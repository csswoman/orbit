alter table public.home_canvas_items
  drop constraint home_canvas_items_kind_check,
  add constraint home_canvas_items_kind_check check (kind in ('note', 'task', 'image', 'link'));

alter table public.space_widgets
  add column link_url text,
  drop constraint space_widgets_widget_type_check,
  drop constraint space_widgets_image_content,
  add constraint space_widgets_widget_type_check check (widget_type in ('sheet', 'image', 'link')),
  add constraint space_widgets_widget_content_check check (
    (widget_type = 'image' and image_path is not null and link_url is null)
    or (widget_type = 'link' and link_url is not null and image_path is null)
    or widget_type = 'sheet'
  );
