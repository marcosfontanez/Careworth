-- Featured carousel: Student Nurses + Gaming stay featured; Pharmacists + Therapy
-- move off the home featured strip (still joinable from search / All).

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
    ('gaming', 7)
) as v (slug, ord)
where c.slug = v.slug;

update public.communities
set featured_order = null
where slug in ('pharmacists', 'therapy');

-- Ensure rooms exist (safe if 071 already applied).
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
