-- Feed queries + get_ranked_feed use exact tokens: 'forYou', 'following', etc.
-- Hand-edited or legacy rows sometimes store 'For You' (wrong) — those posts never match .contains(['forYou']).

UPDATE public.posts SET feed_type_eligible = array_replace(feed_type_eligible, 'For You', 'forYou');
UPDATE public.posts SET feed_type_eligible = array_replace(feed_type_eligible, 'for you', 'forYou');
UPDATE public.posts SET feed_type_eligible = array_replace(feed_type_eligible, 'FOR YOU', 'forYou');
UPDATE public.posts SET feed_type_eligible = array_replace(feed_type_eligible, 'Following', 'following');
