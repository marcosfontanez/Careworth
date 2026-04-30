import { supabase } from '@/lib/supabase';

type NotificationType =
  | 'endorsement'
  | 'streak_milestone'
  | 'reaction'
  | 'milestone_earned'
  | 'shift_wave'
  | 'voice_room_invite'
  | 'new_follower'
  | 'post_like'
  | 'like'
  | 'save'
  | 'share'
  | 'comment'
  | 'reply'
  | 'mention';

interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  message: string;
  targetId?: string;
}

export const socialNotificationsService = {
  async create({ recipientId, type, message, targetId }: CreateNotificationParams): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === recipientId) return false;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        actor_id: user.id,
        type,
        message,
        target_id: targetId ?? null,
        read: false,
      });

    return !error;
  },

  async notifyEndorsement(endorseeId: string, skillName: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const name = profile?.display_name ?? 'Someone';
    await this.create({
      recipientId: endorseeId,
      type: 'endorsement',
      message: `${name} endorsed your ${skillName} skill`,
      targetId: endorseeId,
    });
  },

  async notifyStreakMilestone(userId: string, streakCount: number): Promise<void> {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: userId,
        type: 'streak_milestone',
        message: `You hit a ${streakCount}-day streak! Keep it going!`,
        read: false,
      });
  },

  async notifyReaction(postCreatorId: string, postId: string, reactionType: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const name = profile?.display_name ?? 'Someone';
    const reactionLabels: Record<string, string> = {
      heart: 'loved', 'thumbs-up': 'liked', ribbon: 'awarded',
      flame: 'gave fire to', happy: 'celebrated', medkit: 'gave hero to',
    };

    await this.create({
      recipientId: postCreatorId,
      type: 'reaction',
      message: `${name} ${reactionLabels[reactionType] ?? 'reacted to'} your post`,
      targetId: postId,
    });
  },

  async notifyMilestoneEarned(userId: string, milestoneTitle: string): Promise<void> {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: userId,
        type: 'milestone_earned',
        message: `You earned the "${milestoneTitle}" milestone!`,
        read: false,
      });
  },

  async notifyShiftWave(recipientId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const name = profile?.display_name ?? 'Someone';
    await this.create({
      recipientId,
      type: 'shift_wave',
      message: `${name} waved at you during shift`,
    });
  },

  async notifyVoiceRoomInvite(recipientId: string, roomTitle: string, roomId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const name = profile?.display_name ?? 'Someone';
    await this.create({
      recipientId,
      type: 'voice_room_invite',
      message: `${name} invited you to "${roomTitle}"`,
      targetId: roomId,
    });
  },
};
