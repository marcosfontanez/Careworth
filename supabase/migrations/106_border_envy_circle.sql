-- "Border Envy" — show off profile screenshots with equipped Pulse avatar borders.

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values
  (
    'border-envy',
    'Border Envy',
    '✨',
    'Snapshot your profile showing off the avatar border you’re rocking — rare monthly prizes, beta frames, campaign unlocks, or classic teal. Celebrate the flex, hype honest drip, and help others see what’s possible in Customize My Pulse.',
    '#CA8A04',
    0,
    0
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent_color = excluded.accent_color;

-- Featured strip order (keeps bug reports first; inserts Border Envy after Memes).
update public.communities c
set featured_order = v.ord
from (
  values
    ('bug-reports', 1),
    ('memes', 2),
    ('border-envy', 3),
    ('confessions', 4),
    ('nurses', 5),
    ('student-nurses', 6),
    ('pct-cna', 7),
    ('doctors', 8),
    ('simple-medical-questions', 9),
    ('gaming', 10)
) as v (slug, ord)
where c.slug = v.slug;
