-- ============================================================
-- 012: Social Features Tables
-- Skill Endorsements, Streaks, Reactions, Shift Status,
-- Voice Rooms, Career Milestones
-- ============================================================

-- 1. SKILL ENDORSEMENTS (LinkedIn-inspired)
CREATE TABLE IF NOT EXISTS skill_endorsements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endorser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endorsee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endorser_id, endorsee_id, skill_name)
);

CREATE TABLE IF NOT EXISTS user_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'clinical',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_name)
);

ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view endorsements"
  ON skill_endorsements FOR SELECT USING (true);
CREATE POLICY "Authenticated users can endorse"
  ON skill_endorsements FOR INSERT
  WITH CHECK (auth.uid() = endorser_id AND endorser_id != endorsee_id);
CREATE POLICY "Users can remove their endorsements"
  ON skill_endorsements FOR DELETE
  USING (auth.uid() = endorser_id);

CREATE POLICY "Anyone can view skills"
  ON user_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage their own skills"
  ON user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills"
  ON user_skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills"
  ON user_skills FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_endorsements_endorsee ON skill_endorsements(endorsee_id, skill_name);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);

-- 2. USER STREAKS (Snapchat-inspired)
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  last_active_date DATE,
  streak_started_at DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view streaks"
  ON user_streaks FOR SELECT USING (true);
CREATE POLICY "Users can manage their own streak"
  ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streak"
  ON user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Function to update streak on activity
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_row user_streaks%ROWTYPE;
  v_new_streak INT;
  v_best INT;
BEGIN
  SELECT * INTO v_row FROM user_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, best_streak, last_active_date, streak_started_at)
    VALUES (p_user_id, 1, 1, v_today, v_today);
    RETURN json_build_object('current_streak', 1, 'best_streak', 1);
  END IF;

  IF v_row.last_active_date = v_today THEN
    RETURN json_build_object('current_streak', v_row.current_streak, 'best_streak', v_row.best_streak);
  END IF;

  IF v_row.last_active_date = v_today - 1 THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_best := GREATEST(v_row.best_streak, v_new_streak);

  UPDATE user_streaks
  SET current_streak = v_new_streak,
      best_streak = v_best,
      last_active_date = v_today,
      streak_started_at = CASE WHEN v_new_streak = 1 THEN v_today ELSE v_row.streak_started_at END,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object('current_streak', v_new_streak, 'best_streak', v_best);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POST REACTIONS (Discord/Facebook-inspired)
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'thumbs-up', 'ribbon', 'flame', 'happy', 'medkit')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON post_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react"
  ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change their reaction"
  ON post_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove their reaction"
  ON post_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_reactions_post ON post_reactions(post_id, reaction_type);
CREATE INDEX idx_reactions_user ON post_reactions(user_id, post_id);

-- Aggregate view for quick reaction counts per post
CREATE OR REPLACE FUNCTION get_post_reactions(p_post_id UUID)
RETURNS JSON AS $$
  SELECT COALESCE(
    json_object_agg(reaction_type, cnt),
    '{}'::json
  )
  FROM (
    SELECT reaction_type, COUNT(*) as cnt
    FROM post_reactions
    WHERE post_id = p_post_id
    GROUP BY reaction_type
  ) sub;
$$ LANGUAGE sql STABLE;

-- 4. SHIFT STATUS (Snapchat Map-inspired)
CREATE TABLE IF NOT EXISTS shift_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  department TEXT,
  shift_type TEXT CHECK (shift_type IN ('day', 'evening', 'night')),
  started_at TIMESTAMPTZ,
  facility TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shift_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shift status"
  ON shift_status FOR SELECT USING (true);
CREATE POLICY "Users can set their own shift status"
  ON shift_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shift status"
  ON shift_status FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_shift_active ON shift_status(is_active) WHERE is_active = true;

-- 5. VOICE ROOMS (Discord Stages-inspired)
CREATE TABLE IF NOT EXISTS voice_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_live BOOLEAN DEFAULT false,
  speaker_ids UUID[] DEFAULT '{}',
  listener_count INT DEFAULT 0,
  max_speakers INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE voice_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view voice rooms"
  ON voice_rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms"
  ON voice_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their rooms"
  ON voice_rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their rooms"
  ON voice_rooms FOR DELETE USING (auth.uid() = host_id);

CREATE INDEX idx_voice_rooms_live ON voice_rooms(is_live) WHERE is_live = true;

-- 6. CAREER MILESTONES (LinkedIn-inspired)
CREATE TABLE IF NOT EXISTS career_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, milestone_type)
);

ALTER TABLE career_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view milestones"
  ON career_milestones FOR SELECT USING (true);
CREATE POLICY "System can insert milestones"
  ON career_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_milestones_user ON career_milestones(user_id);

-- 7. STREAK ACTIVITY LOG (tracks daily actions for the week view)
CREATE TABLE IF NOT EXISTS streak_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL DEFAULT 'post',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_date, activity_type)
);

ALTER TABLE streak_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view streak activity"
  ON streak_activity FOR SELECT USING (true);
CREATE POLICY "Users log their own activity"
  ON streak_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_streak_activity_user_date ON streak_activity(user_id, activity_date DESC);

-- 8. AUTO-AWARD MILESTONES TRIGGER
-- Awards milestones when certain thresholds are reached
CREATE OR REPLACE FUNCTION check_and_award_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_post_count INT;
  v_follower_count INT;
BEGIN
  -- posts table uses creator_id
  v_user_id := NEW.creator_id;

  SELECT post_count, follower_count INTO v_post_count, v_follower_count
  FROM profiles WHERE id = v_user_id;

  -- First Post
  IF v_post_count >= 1 THEN
    INSERT INTO career_milestones (user_id, milestone_type, title, description)
    VALUES (v_user_id, 'first_post', 'First Post', 'Published your first post')
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
  END IF;

  -- 10 Posts
  IF v_post_count >= 10 THEN
    INSERT INTO career_milestones (user_id, milestone_type, title, description)
    VALUES (v_user_id, 'posts_10', 'Content Creator', 'Published 10 posts')
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
  END IF;

  -- 100 Followers
  IF v_follower_count >= 100 THEN
    INSERT INTO career_milestones (user_id, milestone_type, title, description)
    VALUES (v_user_id, 'followers_100', 'Century Club', 'Reached 100 followers')
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
  END IF;

  -- 1000 Followers
  IF v_follower_count >= 1000 THEN
    INSERT INTO career_milestones (user_id, milestone_type, title, description)
    VALUES (v_user_id, 'followers_1000', 'Rising Star', 'Reached 1,000 followers')
    ON CONFLICT (user_id, milestone_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to posts table for post-count milestones
DROP TRIGGER IF EXISTS trg_milestone_check_posts ON posts;
CREATE TRIGGER trg_milestone_check_posts
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION check_and_award_milestones();

-- 9. AUTO-UPDATE STREAK ON POST
CREATE OR REPLACE FUNCTION auto_update_streak_on_post()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streak_activity (user_id, activity_date, activity_type)
  VALUES (NEW.creator_id, CURRENT_DATE, 'post')
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

  PERFORM update_user_streak(NEW.creator_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_streak_on_post ON posts;
CREATE TRIGGER trg_streak_on_post
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION auto_update_streak_on_post();
