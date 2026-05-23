import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LiveBrbOverlay } from '@/components/live/LiveBrbOverlay';
import { LiveChatPanel } from '@/components/live/studio/LiveChatPanel';
import { LiveGiftPanel } from '@/components/live/studio/LiveGiftPanel';
import { LiveModPanel } from '@/components/live/studio/LiveModPanel';
import { LivePollPanel } from '@/components/live/studio/LivePollPanel';
import { LiveSettingsPanel } from '@/components/live/studio/LiveSettingsPanel';
import { QuickActionsGrid, type QuickAction } from '@/components/live/studio/QuickActionsGrid';
import { colors, borderRadius, typography } from '@/theme';
import type { StreamMessage, StreamPinnedMessage, StreamPoll } from '@/types';

export type StreamManagerTab =
  | 'chat'
  | 'actions'
  | 'polls'
  | 'gifts'
  | 'mod'
  | 'settings';

const TABS: { id: StreamManagerTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
  { id: 'actions', label: 'Quick', icon: 'flash-outline' },
  { id: 'polls', label: 'Polls', icon: 'stats-chart-outline' },
  { id: 'gifts', label: 'Gifts', icon: 'gift-outline' },
  { id: 'mod', label: 'Mod', icon: 'shield-checkmark-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  streamTitle: string;
  sessionTimer: string;
  viewerCountLabel: string;
  micMuted: boolean;
  brbMode: boolean;
  giftsEnabled: boolean;
  recordingEnabled?: boolean;
  slowModeEnabled: boolean;
  preview?: React.ReactNode;
  messages: StreamMessage[];
  pinned: StreamPinnedMessage | null;
  currentUserId?: string;
  inputText: string;
  onChangeInput: (text: string) => void;
  onSendMessage: () => void;
  onUnpin: () => void;
  onMessageLongPress: (msg: StreamMessage) => void;
  activePoll: StreamPoll | null;
  hasVotedPoll: boolean;
  votedOptionId?: string;
  onPollVote: (optionId: string) => void;
  onCreatePoll: () => void;
  onEndPoll: () => void;
  quickActions: QuickAction[];
  chatBlocked?: boolean;
  chatSending?: boolean;
  pollVoting?: boolean;
  initialTab?: StreamManagerTab;
};

/** Full-screen Live Studio dashboard — preview, status, and tabbed panels. */
export function StreamManagerPanel({
  visible,
  onClose,
  streamTitle,
  sessionTimer,
  viewerCountLabel,
  micMuted,
  brbMode,
  giftsEnabled,
  recordingEnabled,
  slowModeEnabled,
  preview,
  messages,
  pinned,
  currentUserId,
  inputText,
  onChangeInput,
  onSendMessage,
  onUnpin,
  onMessageLongPress,
  activePoll,
  hasVotedPoll,
  votedOptionId,
  onPollVote,
  onCreatePoll,
  onEndPoll,
  quickActions,
  chatBlocked,
  chatSending = false,
  pollVoting = false,
  initialTab = 'chat',
}: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<StreamManagerTab>(initialTab);

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
        <LinearGradient
          colors={['#060E1A', '#0A1220', '#0C1628']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn} accessibilityLabel="Back to camera">
            <Ionicons name="chevron-down" size={22} color="#FFF" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Live Studio</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {streamTitle}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.mainColumn}>
          <View style={styles.topSection}>
            <View style={styles.previewWrap}>
              {brbMode ? (
                <View style={styles.previewBrb}>
                  <LiveBrbOverlay compact onResume={onClose} showResume={false} />
                </View>
              ) : preview ? (
                preview
              ) : (
                <View style={styles.previewFallback}>
                  <Ionicons name="videocam-outline" size={28} color={colors.primary.teal} />
                  <Text style={styles.previewFallbackTxt}>Live preview</Text>
                </View>
              )}
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagTxt}>LIVE</Text>
              </View>
            </View>

            <View style={styles.statusBar}>
              <StatusChip icon="time-outline" label={sessionTimer || '0:00'} />
              <StatusChip icon="eye-outline" label={viewerCountLabel} />
              <StatusChip
                icon={micMuted ? 'mic-off-outline' : 'mic-outline'}
                label={micMuted ? 'Mic off' : 'Mic on'}
                active={!micMuted}
              />
              <StatusChip
                icon="pause-circle-outline"
                label={brbMode ? 'BRB' : 'Live'}
                active={brbMode}
                accent={brbMode ? 'purple' : 'default'}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    style={[styles.tab, on && styles.tabOn]}
                  >
                    <Ionicons name={t.icon} size={14} color={on ? '#0F172A' : colors.dark.textSecondary} />
                    <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.panel}>
            {tab === 'chat' ? (
              <LiveChatPanel
                messages={messages}
                pinned={pinned}
                currentUserId={currentUserId}
                inputText={inputText}
                onChangeInput={onChangeInput}
                onSend={onSendMessage}
                onUnpin={onUnpin}
                onMessageLongPress={onMessageLongPress}
                onLaunchPoll={onCreatePoll}
                chatBlocked={chatBlocked}
                chatSending={chatSending}
                fillAvailable
              />
            ) : null}
            {tab !== 'chat' ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelScroll}>
                {tab === 'actions' ? <QuickActionsGrid actions={quickActions} /> : null}
                {tab === 'polls' ? (
                  <LivePollPanel
                    poll={activePoll}
                    hasVoted={hasVotedPoll}
                    votedOptionId={votedOptionId}
                    onVote={onPollVote}
                    onCreatePoll={onCreatePoll}
                    onEndPoll={onEndPoll}
                    pollVoting={pollVoting}
                  />
                ) : null}
                {tab === 'gifts' ? <LiveGiftPanel giftsEnabled={giftsEnabled} /> : null}
                {tab === 'mod' ? <LiveModPanel slowModeEnabled={slowModeEnabled} /> : null}
                {tab === 'settings' ? (
                  <LiveSettingsPanel streamTitle={streamTitle} recordingEnabled={recordingEnabled} />
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatusChip({
  icon,
  label,
  active,
  accent = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  accent?: 'default' | 'purple';
}) {
  return (
    <View
      style={[
        styles.chip,
        active && accent === 'purple' && styles.chipPurple,
        active && accent !== 'purple' && styles.chipActive,
      ]}
    >
      <Ionicons
        name={icon}
        size={13}
        color={active ? (accent === 'purple' ? '#C4B5FD' : colors.primary.teal) : colors.dark.textSecondary}
      />
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },
  headerTitle: { ...typography.h3, fontSize: 17, fontWeight: '800', color: colors.neutral.white },
  headerSub: { ...typography.caption, color: colors.dark.textMuted, marginTop: 2, maxWidth: '90%' },
  mainColumn: { flex: 1, paddingHorizontal: 14, paddingBottom: 8 },
  topSection: { flexShrink: 0 },
  panelScroll: { paddingBottom: 16 },
  previewWrap: {
    height: 148,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
    marginBottom: 12,
  },
  previewBrb: { flex: 1 },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(12,18,32,0.92)',
  },
  previewFallbackTxt: { ...typography.caption, color: colors.dark.textMuted, fontWeight: '700' },
  liveTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.status.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveTagTxt: { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  statusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: { borderColor: 'rgba(56,189,248,0.35)' },
  chipPurple: { borderColor: 'rgba(167,139,250,0.45)', backgroundColor: 'rgba(46,16,101,0.55)' },
  chipTxt: { ...typography.caption, fontSize: 11, fontWeight: '700', color: colors.dark.textSecondary },
  chipTxtActive: { color: colors.neutral.white },
  tabRow: { gap: 8, paddingBottom: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabOn: { backgroundColor: colors.primary.teal, borderColor: 'rgba(255,255,255,0.22)' },
  tabTxt: { ...typography.caption, fontSize: 11, fontWeight: '700', color: colors.dark.textSecondary },
  tabTxtOn: { color: '#0F172A' },
  panel: { flex: 1, minHeight: 0 },
});
