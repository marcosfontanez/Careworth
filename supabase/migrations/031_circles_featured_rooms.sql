-- Circles featured rooms: therapy + clearer display names for starter communities.

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values (
  'therapy',
  'Therapy',
  '🧠',
  'PT, OT, speech-language pathology, and rehab — caseloads, documentation, and patient progress.',
  '#8B5CF6',
  12000,
  2100
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent_color = excluded.accent_color;

update public.communities
set
  name = 'Funny memes',
  description = 'Healthcare humor. Post memes and reactions — keep it kind.'
where slug = 'memes';

update public.communities
set
  name = 'Anonymous confessions / stories',
  description = 'Fully anonymous. Names are random per thread; the original poster gets a subtle glow when replying in their own thread only.'
where slug = 'confessions';

update public.communities
set name = 'Patient care / CNA'
where slug = 'pct-cna';

update public.communities
set name = 'Physicians'
where slug = 'doctors';
