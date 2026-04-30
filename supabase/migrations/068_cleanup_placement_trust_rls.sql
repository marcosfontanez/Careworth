-- If 067 was applied before redundant "Admins read placement trust" was removed
-- from the migration file, drop the duplicate SELECT policy (ALL policy remains).
drop policy if exists "Admins read placement trust" on public.placement_trust_scores;
