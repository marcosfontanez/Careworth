-- Therapy circle: room icon reads as rehab / mobility (PT, OT, SLP) rather than neurology / "brain".

update public.communities
set icon = '🩼'
where slug = 'therapy';
