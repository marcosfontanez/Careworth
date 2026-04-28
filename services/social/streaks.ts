import { supabase } from '@/lib/supabase';
import { socialNotificationsService } from './notifications';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  streakStartedAt: string | null;
}

export interface WeekActivity {
  date: string;
  dayLabel: string;
  isActive: boolean;
}

export const streaksService = {
  async getStreak(userId: string): Promise<StreakData> {
    const { data } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: null, streakStartedAt: null };
    }

    return {
      currentStreak: data.current_streak,
      bestStreak: data.best_streak,
      lastActiveDate: data.last_active_date,
      streakStartedAt: data.streak_started_at,
    };
  },

  async recordActivity(activityType: string = 'post'): Promise<StreakData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { currentStreak: 0, bestStreak: 0, lastActiveDate: null, streakStartedAt: null };

    await supabase
      .from('streak_activity')
      .upsert(
        { user_id: user.id, activity_date: new Date().toISOString().split('T')[0], activity_type: activityType },
        { onConflict: 'user_id,activity_date,activity_type' },
      );

    const { data } = await supabase.rpc('update_user_streak', { p_user_id: user.id });

    const newStreak = data?.current_streak ?? 0;
    const milestoneThresholds = [7, 30, 100, 365];
    if (milestoneThresholds.includes(newStreak)) {
      socialNotificationsService.notifyStreakMilestone(user.id, newStreak).catch(() => {});
    }

    return {
      currentStreak: newStreak,
      bestStreak: data?.best_streak ?? 0,
      lastActiveDate: new Date().toISOString().split('T')[0],
      streakStartedAt: null,
    };
  },

  async getWeekActivity(userId: string): Promise<WeekActivity[]> {
    const today = new Date();
    const days: WeekActivity[] = [];
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const endDate = new Date(startOfWeek);
    endDate.setDate(endDate.getDate() + 6);

    const { data: activities } = await supabase
      .from('streak_activity')
      .select('activity_date')
      .eq('user_id', userId)
      .gte('activity_date', startOfWeek.toISOString().split('T')[0])
      .lte('activity_date', endDate.toISOString().split('T')[0]);

    const activeDates = new Set((activities ?? []).map((a) => a.activity_date));

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayLabel: dayLabels[d.getDay()],
        isActive: activeDates.has(dateStr),
      });
    }

    return days;
  },
};
