import { supabase } from '@/lib/supabase';
import { parsePulseWeeklyRecap, type PulseWeeklyRecap } from '@/lib/pulseWeeklyRecap';

export const pulseWeeklyRecapService = {
  async getForUser(userId: string): Promise<PulseWeeklyRecap | null> {
    const { data, error } = await supabase.rpc('get_my_pulse_weekly_recap', {
      p_user_id: userId,
    } as never);

    if (error) {
      if (__DEV__) console.warn('[pulseWeeklyRecap.getForUser]', error.message);
      return null;
    }

    return parsePulseWeeklyRecap(data);
  },
};
