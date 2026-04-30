-- Student Nurses (after Nurses) + Gaming circles; renumber featured carousel.

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values
  (
    'student-nurses',
    'Student Nurses',
    '🎓',
    'Nursing students — clinicals, skills, study tips, and moral support from people on the same path.',
    '#0369A1',
    0,
    0
  ),
  (
    'gaming',
    'Gaming',
    '🎮',
    'What you play off-shift — cozy games, co-op, esports, and finding squad-mates who get the grind.',
    '#B91C1C',
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
    ('memes', 1),
    ('confessions', 2),
    ('nurses', 3),
    ('student-nurses', 4),
    ('pct-cna', 5),
    ('doctors', 6),
    ('pharmacists', 7),
    ('therapy', 8),
    ('gaming', 9)
) as v (slug, ord)
where c.slug = v.slug;
