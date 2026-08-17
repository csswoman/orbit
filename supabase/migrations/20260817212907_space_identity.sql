alter table public.orbit_spaces
  add column accent_color text not null default '#9388ff';

alter table public.orbit_spaces
  add constraint orbit_spaces_accent_color_check
  check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

update public.orbit_spaces
set accent_color = case kind
  when 'food' then '#e8a07a'
  when 'subscriptions' then '#6ea8ff'
  when 'wishlist' then '#f4a8d4'
  when 'clothing' then '#b5e3a8'
  when 'travel' then '#7ec8e3'
  when 'sales' then '#f0c36a'
  when 'projects' then '#a99bff'
  when 'inspiration' then '#edf0ff'
  else '#9388ff'
end
where accent_color = '#9388ff';
