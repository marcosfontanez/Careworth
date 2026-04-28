-- Ensure every Circles "Featured" room exists even if migration 007 was never applied
-- (031 only INSERTed therapy; UPDATEs no-op when memes/nurses rows are missing).

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values
  (
    'memes',
    'Funny Memes',
    '😂',
    'Healthcare humor. Post memes and reactions — keep it kind.',
    '#F97316',
    56400,
    14200
  ),
  (
    'confessions',
    'Anonymous confessions / stories',
    '🤫',
    'Fully anonymous. Names are random per thread; the original poster gets a subtle glow when replying in their own thread only.',
    '#6B21A8',
    47500,
    12100
  ),
  (
    'nurses',
    'Nurses',
    '🩺',
    'All RNs, LPNs, and LVNs — every specialty, every floor. Share tips, vent, and connect with fellow nurses.',
    '#1E4ED8',
    84200,
    21400
  ),
  (
    'pct-cna',
    'Patient care / CNA',
    '💪',
    'Patient care techs and CNAs — the hands of patient care, documentation, and teamwork.',
    '#14B8A6',
    38600,
    8900
  ),
  (
    'doctors',
    'Physicians',
    '⚕️',
    'MDs, DOs, residents, and fellows — cases, collaboration, and the long shift.',
    '#0B1F3A',
    22100,
    4800
  ),
  (
    'pharmacists',
    'Pharmacists',
    '💊',
    'PharmDs, techs, and students — interactions, workflow, and pharmacy life.',
    '#10B981',
    15800,
    3200
  ),
  (
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
  accent_color = excluded.accent_color,
  member_count = excluded.member_count,
  post_count = excluded.post_count;
