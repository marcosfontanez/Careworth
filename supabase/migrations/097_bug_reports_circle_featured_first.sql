-- Bug reports circle: first in featured carousel; ask for screenshots + clear repro.

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values
  (
    'bug-reports',
    'Bug reports',
    '🐛',
    'If Pulseverse glitches or crashes, post here. Add a screenshot when you can (or describe exactly what you saw), what you tapped before it happened, and your device (iPhone / Android / web). That helps us fix it faster.',
    '#D97706',
    0,
    0
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent_color = excluded.accent_color;

update public.communities c
set featured_order = v.ord
from (
  values
    ('bug-reports', 1),
    ('memes', 2),
    ('confessions', 3),
    ('nurses', 4),
    ('student-nurses', 5),
    ('pct-cna', 6),
    ('doctors', 7),
    ('gaming', 8)
) as v (slug, ord)
where c.slug = v.slug;
