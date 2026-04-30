import { supabase } from '@/lib/supabase';

export interface MilestoneData {
  id: string;
  milestoneType: string;
  title: string;
  description: string;
  earnedAt: string;
}

export const MILESTONE_DEFS: { type: string; title: string; description: string; icon: string; color: string }[] = [
  { type: 'joined', title: 'Joined PulseVerse', description: 'Welcome to the community', icon: 'sparkles', color: '#14B8A6' },
  { type: 'first_post', title: 'First Post', description: 'Published your first post', icon: 'create', color: '#EF4444' },
  { type: 'posts_10', title: 'Content Creator', description: 'Published 10 posts', icon: 'videocam', color: '#F59E0B' },
  { type: 'followers_100', title: 'Century Club', description: 'Reached 100 followers', icon: 'people', color: '#8B5CF6' },
  { type: 'followers_1000', title: 'Rising Star', description: 'Reached 1,000 followers', icon: 'star', color: '#EC4899' },
  { type: 'verified', title: 'Verified Professional', description: 'Got verified on PulseVerse', icon: 'checkmark-circle', color: '#D4A63A' },
  { type: 'streak_30', title: '30-Day Streak', description: 'Posted 30 days in a row', icon: 'flame', color: '#F97316' },
  { type: 'community_leader', title: 'Community Leader', description: 'Created a community', icon: 'flag', color: '#3B82F6' },
  { type: 'mentor', title: 'Mentor', description: 'Helped 100 people', icon: 'school', color: '#6366F1' },
  { type: 'one_year', title: '1 Year on PulseVerse', description: 'A full year of connection', icon: 'calendar', color: '#14B8A6' },
];

export const milestonesService = {
  async getUserMilestones(userId: string): Promise<MilestoneData[]> {
    const { data } = await supabase
      .from('career_milestones')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: true });

    if (!data) return [];
    return data.map((row) => ({
      id: row.id,
      milestoneType: row.milestone_type,
      title: row.title,
      description: row.description ?? '',
      earnedAt: row.earned_at ?? '',
    }));
  },

  async awardMilestone(milestoneType: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const def = MILESTONE_DEFS.find((m) => m.type === milestoneType);
    if (!def) return false;

    const { error } = await supabase
      .from('career_milestones')
      .upsert({
        user_id: user.id,
        milestone_type: milestoneType,
        title: def.title,
        description: def.description,
      }, { onConflict: 'user_id,milestone_type' });

    return !error;
  },

  async checkAndAwardJoinedMilestone(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('career_milestones')
      .upsert({
        user_id: user.id,
        milestone_type: 'joined',
        title: 'Joined PulseVerse',
        description: 'Welcome to the community',
      }, { onConflict: 'user_id,milestone_type' });
  },

  async getMilestoneCount(userId: string): Promise<{ earned: number; total: number }> {
    const { count } = await supabase
      .from('career_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return { earned: count ?? 0, total: MILESTONE_DEFS.length };
  },
};
