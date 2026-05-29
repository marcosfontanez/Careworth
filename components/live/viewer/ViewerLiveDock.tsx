import React from 'react';
import { LiveControlDock, type LiveDockAction } from '@/components/live/LiveControlDock';

type Props = {
  onOpenChat: () => void;
  onOpenGifts: () => void;
  onOpenPoll: () => void;
  onOpenQna: () => void;
  onOpenInfo: () => void;
  chatActive?: boolean;
  giftsEnabled: boolean;
  hasPoll: boolean;
  pollActive?: boolean;
  qnaActive?: boolean;
  disabled?: boolean;
};

/** Minimal viewer interaction dock — opens bottom sheets. */
export function ViewerLiveDock({
  onOpenChat,
  onOpenGifts,
  onOpenPoll,
  onOpenQna,
  onOpenInfo,
  chatActive,
  giftsEnabled,
  hasPoll,
  pollActive,
  qnaActive,
  disabled,
}: Props) {
  const actions: LiveDockAction[] = [
    {
      key: 'chat',
      icon: chatActive ? 'chatbubble' : 'chatbubble-outline',
      label: 'Chat',
      onPress: onOpenChat,
      active: chatActive,
      disabled,
    },
    {
      key: 'gifts',
      icon: 'gift-outline',
      label: 'Gifts',
      onPress: onOpenGifts,
      accent: 'gold',
      disabled: disabled || !giftsEnabled,
    },
    {
      key: 'poll',
      icon: 'stats-chart-outline',
      label: 'Poll',
      onPress: onOpenPoll,
      active: pollActive,
      disabled: disabled || !hasPoll,
    },
    {
      key: 'qna',
      icon: 'help-circle-outline',
      label: 'Q&A',
      onPress: onOpenQna,
      active: qnaActive,
      disabled,
    },
    {
      key: 'info',
      icon: 'information-circle-outline',
      label: 'Info',
      onPress: onOpenInfo,
      disabled,
    },
  ];

  return <LiveControlDock actions={actions} />;
}
