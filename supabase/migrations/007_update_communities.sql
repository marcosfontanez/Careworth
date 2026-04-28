-- ============================================================
-- PulseVerse: Update communities to simplified broad categories
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Remove old specialty-based communities
delete from public.communities;

-- Insert new broad categories
insert into public.communities (id, slug, name, icon, description, accent_color, member_count, post_count) values
  (gen_random_uuid(), 'nurses',      'Nurses',        '🩺', 'All RNs, LPNs, and LVNs — every specialty, every floor. Share tips, vent, and connect with fellow nurses.', '#1E4ED8', 84200, 21400),
  (gen_random_uuid(), 'pct-cna',     'PCT / CNAs',    '💪', 'Patient care techs and certified nursing assistants. The hands of patient care.',                          '#14B8A6', 38600, 8900),
  (gen_random_uuid(), 'doctors',     'Doctors',       '⚕️', 'MDs, DOs, residents, and fellows. Cross-discipline discussions and collaboration.',                         '#0B1F3A', 22100, 4800),
  (gen_random_uuid(), 'new-grads',   'New Grads',     '🎓', 'Just passed your boards? First year on the floor? This is your people. No question is too basic.',           '#6366F1', 42800, 9600),
  (gen_random_uuid(), 'memes',       'Funny Memes',   '😂', 'Healthcare humor at its finest. If you don''t laugh, you cry. Post your best memes.',                       '#F97316', 56400, 14200),
  (gen_random_uuid(), 'confessions', 'Confessions',   '🤫', 'Anonymous space for the real, raw, unfiltered moments of healthcare work. Safe zone.',                      '#6B21A8', 47500, 12100),
  (gen_random_uuid(), 'study',       'Study & Certs', '📚', 'NCLEX prep, certifications, CEUs, and study groups. Learn together, pass together.',                        '#3B82F6', 33900, 7400),
  (gen_random_uuid(), 'nursing-students', 'Nursing Students', '📖', 'Pre-nursing, BSN, ADN, and ABSN students. Clinicals, study groups, and surviving nursing school together.', '#EC4899', 52100, 11300),
  (gen_random_uuid(), 'medical-students', 'Medical Students', '🔬', 'Pre-med, med school, and residency-bound. MCAT, boards, rotations, and the grind.',                    '#6366F1', 28400, 5900),
  (gen_random_uuid(), 'pharmacists', 'Pharmacists',   '💊', 'PharmDs, techs, and pharmacy students. Drug interactions, workflow tips, and pharmacy life.',                '#10B981', 15800, 3200);
