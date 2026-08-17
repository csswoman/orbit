alter table public.user_preferences
  alter column accent_color set default '#6350C9',
  alter column background_color set default '#0A0D1E',
  alter column surface_color set default '#14182F',
  alter column text_color set default '#F5F4FF',
  alter column dashboard_overlay set default 0.72;

update public.user_preferences
set
  accent_color = '#6350C9',
  background_color = '#0A0D1E',
  surface_color = '#14182F',
  text_color = '#F5F4FF'
where accent_color = '#4F46E5'
  and background_color = '#FAFAFA'
  and surface_color = '#FFFFFF'
  and text_color = '#18181B';
