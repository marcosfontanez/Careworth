import { supabase } from '@/lib/supabase';

export interface UserCoinsBalance {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
}

const EMPTY: UserCoinsBalance = { balance: 0, totalPurchased: 0, totalSpent: 0 };

export const userCoinsService = {
  /**
   * Read the caller's coin wallet. Returns zeros if the row doesn't exist yet
   * so callers never have to special-case "new user" paths.
   */
  async getBalance(userId: string): Promise<UserCoinsBalance> {
    if (!userId) return EMPTY;

    const { data, error } = await supabase
      .from('user_coins')
      .select('balance, total_purchased, total_spent')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[userCoins.getBalance]', error.message);
      return EMPTY;
    }
    if (!data) return EMPTY;

    return {
      balance: data.balance ?? 0,
      totalPurchased: data.total_purchased ?? 0,
      totalSpent: data.total_spent ?? 0,
    };
  },

  /**
   * Ensure the caller has a wallet row. Idempotent — safe to call whenever
   * the coin balance is about to be read for the first time.
   */
  async ensureRow(userId: string): Promise<void> {
    if (!userId) return;
    const { error } = await supabase
      .from('user_coins')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (error && __DEV__) console.warn('[userCoins.ensureRow]', error.message);
  },
};
