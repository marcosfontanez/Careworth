-- ============================================================================
-- 255: Feed ranker v3 — expand onboarding interest cold-start via hashtag synonyms
--
-- `user_interests.interest` stores app keys (e.g. shift_stories). Posts often
-- tag #nursing, #memes, etc. This helper maps each interest to related topics
-- so cold-start scoring matches real hashtag vocabulary.
-- ============================================================================

create or replace function public.feed_interest_match_topics(p_interest text)
returns text[]
language sql
immutable
strict
as $$
  select case lower(trim(p_interest))
    when 'shift_stories' then array[
      'shift_stories', 'shiftstories', 'shift', 'stories', 'dayinthelife',
      'nursing', 'healthcare', 'nurse', 'nurses', 'hospital', 'realtalk'
    ]
    when 'humor' then array[
      'humor', 'memes', 'meme', 'funny', 'healthcarehumor', 'comedy', 'laughter', 'lol'
    ]
    when 'education' then array[
      'education', 'learn', 'learning', 'tips', 'healthliteracy', 'meded', 'explainer'
    ]
    when 'career_tips' then array[
      'career_tips', 'career', 'careertips', 'jobs', 'jobsearch', 'resume', 'interview', 'path'
    ]
    when 'caregiver_support' then array[
      'caregiver_support', 'caregiver', 'caregivers', 'family', 'support', 'sandwichgeneration'
    ]
    when 'behind_the_scenes' then array[
      'behind_the_scenes', 'bts', 'behindthescenes', 'reality', 'workflow', 'dayinthelife'
    ]
    when 'community_conversations' then array[
      'community_conversations', 'community', 'discussion', 'conversations', 'chat', 'thread'
    ]
    when 'live_qa' then array[
      'live_qa', 'live', 'qa', 'askme', 'ama', 'qanda', 'questions'
    ]
    when 'medical_mythbusters' then array[
      'medical_mythbusters', 'mythbusters', 'myth', 'facts', 'debunk', 'science', 'evidence'
    ]
    when 'new_grad' then array[
      'new_grad', 'newgrad', 'student', 'students', 'nclex', 'clinical', 'school', 'studying'
    ]
    when 'patient_family_guidance' then array[
      'patient_family_guidance', 'patient', 'family', 'guidance', 'advocate', 'caregiver'
    ]
    when 'true_stories' then array[
      'true_stories', 'truestories', 'story', 'casestudy', 'realtalk', 'confession'
    ]
    when 'local_jobs' then array['local_jobs', 'localjobs', 'hiring', 'jobs', 'recruiting']
    when 'travel_nursing' then array['travel_nursing', 'travelnursing', 'travel', 'travelnurse']
    when 'leadership' then array['leadership', 'manager', 'charge', 'admin', 'lead']
    when 'gear_tools' then array['gear_tools', 'gear', 'tools', 'equipment', 'scrubs', 'edc']
    when 'certifications' then array['certifications', 'cert', 'certification', 'certs', 'bls', 'acls']
    else array[lower(trim(p_interest))]
  end;
$$;

comment on function public.feed_interest_match_topics(text) is
  'Maps a user_interests.interest key to lowercase hashtag / role / specialty tokens for cold-start feed matching.';

-- Patch v3 cold-start CTE + scoring to use expanded topics.
create or replace function public.get_ranked_feed_v3(
  viewer_id         uuid,
  feed_limit        int          default 50,
  exclude_post_ids  uuid[]       default '{}'::uuid[]
)
returns table (
  post_id uuid,
  score   float,
  source  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id  uuid     := viewer_id;
  v_feed_limit int      := feed_limit;
  v_exclude    uuid[]   := coalesce(exclude_post_ids, '{}'::uuid[]);

  v_role      text;
  v_specialty text;
  v_state     text;

  v_follow_ct int;
  v_like_ct   int;
  v_save_ct   int;
  v_is_cold   boolean;
begin
  if v_viewer_id is null then
    return;
  end if;

  select pr.role, pr.specialty, pr.state
    into v_role, v_specialty, v_state
  from public.profiles pr
  where pr.id = v_viewer_id;

  select count(*) into v_follow_ct
    from public.follows
    where follower_id = v_viewer_id;

  select count(*) into v_like_ct
    from public.post_likes
    where user_id = v_viewer_id
      and created_at >= now() - interval '90 days';

  select count(*) into v_save_ct
    from public.saved_posts
    where user_id = v_viewer_id
      and saved_at >= now() - interval '90 days';

  v_is_cold := (coalesce(v_follow_ct,0) = 0
                and coalesce(v_like_ct,0) = 0
                and coalesce(v_save_ct,0) = 0);

  return query
  with
    hidden_post_ids as (
      select fa.post_id as id
      from public.feed_user_actions fa
      where fa.user_id = v_viewer_id
        and fa.action = 'not_interested'
        and fa.post_id is not null
    ),
    hidden_creator_ids as (
      select distinct cid as id from (
        select fa.creator_id as cid
          from public.feed_user_actions fa
          where fa.user_id = v_viewer_id
            and fa.action = 'hide_creator'
            and fa.creator_id is not null
        union
        select bu.blocked_id as cid
          from public.blocked_users bu
          where bu.blocker_id = v_viewer_id
        union
        select bu.blocker_id as cid
          from public.blocked_users bu
          where bu.blocked_id = v_viewer_id
      ) x
    ),
    followed_creators as (
      select following_id as creator_id
      from public.follows
      where follower_id = v_viewer_id
    ),
    liked_creators as (
      select distinct p.creator_id
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
    ),
    saved_creators as (
      select distinct p.creator_id
      from public.saved_posts sp
      join public.posts p on p.id = sp.post_id
      where sp.user_id = v_viewer_id
        and sp.saved_at >= now() - interval '90 days'
    ),
    viewer_top_hashtags as (
      select tag, count(*)::int as ct
      from public.post_likes pl
      join public.posts p on p.id = pl.post_id
      cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
      where pl.user_id = v_viewer_id
        and pl.created_at >= now() - interval '90 days'
        and length(trim(tag)) > 0
      group by tag
      order by ct desc
      limit 5
    ),
    creator_completion as (
      select
        p.creator_id,
        sum(case when pv.view_duration_ms > 5000 then 1 else 0 end)::float
          / nullif(count(*), 0)::float as rate
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
        and pv.created_at >= now() - interval '60 days'
      group by p.creator_id
    ),
    creator_skip_counts as (
      select
        p.creator_id,
        count(distinct pv.post_id)::int as skip_ct
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      where pv.viewer_id = v_viewer_id
        and pv.view_duration_ms < 1500
        and pv.created_at >= now() - interval '30 days'
      group by p.creator_id
    ),
    skipped_hashtags as (
      select tag, count(*)::int as ct
      from public.post_views pv
      join public.posts p on p.id = pv.post_id
      cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
      where pv.viewer_id = v_viewer_id
        and pv.view_duration_ms < 1500
        and pv.created_at >= now() - interval '30 days'
        and length(trim(tag)) > 0
      group by tag
      having count(*) >= 2
    ),
    viewer_interest_topics as (
      select distinct lower(trim(t)) as topic
      from public.user_interests ui
      cross join lateral unnest(public.feed_interest_match_topics(ui.interest)) as t
      where ui.user_id = v_viewer_id
        and length(trim(coalesce(ui.interest, ''))) > 0
        and length(trim(t)) > 0
    )

  select
    posts.id as post_id,
    (
      coalesce(posts.ranking_score, 0) * 10
      + (
          (posts.like_count + posts.comment_count * 2 + posts.share_count * 3)::float
          / greatest(extract(epoch from (now() - posts.created_at)) / 3600, 1)
        ) * 5
      + 100 * exp(-0.058 * extract(epoch from (now() - posts.created_at)) / 3600)
      + ln(greatest(posts.view_count, 1) + 1) * 3
      + case when posts.role_context      = v_role      then 15 else 0 end
      + case when posts.specialty_context = v_specialty then 20 else 0 end
      + case when posts.location_context  = v_state     then 10 else 0 end
      + case when posts.type = 'video'                  then  8 else 0 end
      + case when creator.is_verified                   then  5 else 0 end
      + case
          when not v_is_cold and exists (
            select 1 from followed_creators fc where fc.creator_id = posts.creator_id
          ) then 30 else 0
        end
      + case
          when not v_is_cold and exists (
            select 1 from liked_creators lc where lc.creator_id = posts.creator_id
          ) then 20 else 0
        end
      + case
          when not v_is_cold and exists (
            select 1 from saved_creators sc where sc.creator_id = posts.creator_id
          ) then 12 else 0
        end
      + case when not v_is_cold then
          (select count(*)::int * 8
             from viewer_top_hashtags vth
             where vth.tag = any (coalesce(posts.hashtags, '{}'::text[])))
        else 0 end
      + case when not v_is_cold then
          coalesce(
            (select cc.rate * 25
               from creator_completion cc
               where cc.creator_id = posts.creator_id),
            0
          )
        else 0 end
      + coalesce(
          (
            select case
              when csc.skip_ct >= 3 then -30
              when csc.skip_ct = 2  then -15
              when csc.skip_ct = 1  then  -5
              else 0
            end
            from creator_skip_counts csc
            where csc.creator_id = posts.creator_id
          ),
          0
        )
      + greatest(
          -25,
          - (
            select count(*)::int * 5
            from skipped_hashtags sh
            where sh.tag = any (coalesce(posts.hashtags, '{}'::text[]))
          )
        )
      + case when posts.created_at >= now() - interval '30 minutes' then 40 else 0 end
      + case when v_is_cold then
          (
            select count(distinct vi.topic)::int * 15
            from viewer_interest_topics vi
            where vi.topic = any (
                    select lower(trim(t))
                    from unnest(coalesce(posts.hashtags, '{}'::text[])) as t
                  )
               or vi.topic = lower(trim(coalesce(posts.specialty_context, '')))
               or vi.topic = lower(trim(coalesce(posts.role_context, '')))
          )
        else 0 end
      + case
          when v_is_cold and posts.created_at >= now() - interval '24 hours' then
            (
              posts.like_count
              + posts.comment_count * 1.5
              + posts.share_count * 3
              + posts.save_count * 2.5
            )::float * 0.5
            + ln(greatest(posts.view_count, 1) + 1) * 4
          else 0
        end
    )::float as score,
    case when v_is_cold then 'cold_start' else 'personalized' end as source
  from public.posts
  left join public.profiles creator on creator.id = posts.creator_id
  where
    exists (
      select 1
      from unnest(coalesce(posts.feed_type_eligible, array[]::text[])) as el
      where trim(el) = 'forYou'
         or replace(lower(trim(el)), ' ', '') = 'foryou'
    )
    and (
      posts.privacy_mode = 'public'
      or posts.creator_id = v_viewer_id
    )
    and coalesce(posts.scheduled_status, 'live') = 'live'
    and (
      posts.media_processing_status is null
      or lower(trim(posts.media_processing_status)) not in ('queued', 'running', 'failed')
    )
    and not exists (select 1 from hidden_post_ids hp where hp.id = posts.id)
    and not exists (select 1 from hidden_creator_ids hc where hc.id = posts.creator_id)
    and not (posts.id = any (v_exclude))
  order by score desc
  limit greatest(v_feed_limit, 1);
end;
$$;

comment on function public.get_ranked_feed_v3(uuid, int, uuid[]) is
  'Personalized For You ranker (beta v3): cold-start uses feed_interest_match_topics() synonym expansion for onboarding interests.';

grant execute on function public.feed_interest_match_topics(text) to authenticated;
grant execute on function public.feed_interest_match_topics(text) to anon;
