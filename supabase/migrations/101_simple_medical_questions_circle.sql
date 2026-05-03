-- Simple Medical Questions: peer Q&A with clear “not a substitute for professional care” framing.

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values
  (
    'simple-medical-questions',
    'Simple Medical Questions',
    '💬',
    'Quick, general questions for healthcare peers. This is not medical advice and does not replace an in-person visit with a licensed professional—just a place to share simple tips and experience where people can try to help.',
    '#0D9488',
    0,
    0
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent_color = excluded.accent_color;

update public.communities
set featured_order = 9
where slug = 'simple-medical-questions';
