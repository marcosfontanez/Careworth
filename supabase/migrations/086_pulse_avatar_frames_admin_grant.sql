-- Admin catalog expansion + staff gifting of avatar borders (user_pulse_avatar_frames).
-- Catalog stays in pulse_avatar_frames (one row per border design). Staff grants use
-- grant_source = 'admin' and leaderboard_rank = 0 (not a monthly podium rank).

-- Broader tier labels for future exclusive / campaign frames (still one row per design).
alter table public.pulse_avatar_frames
  drop constraint if exists pulse_avatar_frames_prize_tier_chk;

alter table public.pulse_avatar_frames
  add constraint pulse_avatar_frames_prize_tier_chk
    check (
      prize_tier in (
        'gold',
        'silver',
        'bronze',
        'exclusive',
        'legacy',
        'campaign'
      )
    );

-- Staff grants: rank 0 + grant_source admin. Monthly top-5 remains leaderboard + rank 1–5.
alter table public.user_pulse_avatar_frames
  add column if not exists grant_source text not null default 'leaderboard';

alter table public.user_pulse_avatar_frames
  drop constraint if exists user_pulse_avatar_frames_rank_chk;

alter table public.user_pulse_avatar_frames
  add constraint user_pulse_avatar_frames_grant_source_chk
    check (grant_source in ('leaderboard', 'admin'));

alter table public.user_pulse_avatar_frames
  add constraint user_pulse_avatar_frames_grant_rank_chk
    check (
      (grant_source = 'leaderboard' and leaderboard_rank between 1 and 5)
      or (grant_source = 'admin' and leaderboard_rank = 0)
    );
