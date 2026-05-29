import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Keyboard,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, type CameraType } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { borderRadius, colors, layout, spacing, typography, shadows, pulseverse } from '@/theme';
import { streamsLiveService } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import type { StreamCategory } from '@/types';
import { PV_LIVE_MODE_TAG_PREFIX, type LiveModeType } from '@/types/liveHub';
import { liveStreamHref } from '@/lib/navigation/liveRoutes';
import { analytics } from '@/lib/analytics';
import {
  checkLiveBroadcastPermissions,
  missingPermissionLabel,
  openAppSettings,
  requestLiveBroadcastPermissions,
  type LiveBroadcastPermissionState,
} from '@/lib/live/liveBroadcastPermissions';
import { LiveBroadcastPermissionModal } from '@/components/live/go-live/LiveBroadcastPermissionModal';

const MODES: { id: LiveModeType; title: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    id: 'casual',
    title: 'Casual Live',
    desc: 'Chat, Q&A, lifestyle — relaxed bedside energy.',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    id: 'irl',
    title: 'IRL Live',
    desc: 'Walk-with-me streams — authentic shift rhythms.',
    icon: 'walk-outline',
  },
  {
    id: 'gaming',
    title: 'Gaming Live',
    desc: 'Ranked wind-downs with a respectful nurse-chat vibe.',
    icon: 'game-controller-outline',
  },
  {
    id: 'learn',
    title: 'Teach / Lecture',
    desc: 'Workshops, panels, certification prep — structured.',
    icon: 'school-outline',
  },
  {
    id: 'shop',
    title: 'Sell Products Live',
    desc: 'Shop-safe demos — scrubs, tools, creator merch.',
    icon: 'bag-handle-outline',
  },
];

function modeToCategory(m: LiveModeType): StreamCategory {
  switch (m) {
    case 'casual':
      return 'shift-talk';
    case 'irl':
      return 'day-in-the-life';
    case 'gaming':
      return 'chill';
    case 'learn':
      return 'clinical-skills';
    case 'shop':
      return 'career-advice';
    default:
      return 'other';
  }
}

export function GoLiveWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const showToast = useToast((s) => s.show);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<LiveModeType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [learnTopic, setLearnTopic] = useState('');
  const [learnQna, setLearnQna] = useState(true);
  const [learnPolls, setLearnPolls] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [scheduled, setScheduled] = useState(false);
  const [liveDeal, setLiveDeal] = useState(false);
  const [giveaway, setGiveaway] = useState(false);
  const [disclosuresOk, setDisclosuresOk] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return d;
  });
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<CameraView>(null);
  const [permState, setPermState] = useState<LiveBroadcastPermissionState | null>(null);
  const [permChecking, setPermChecking] = useState(false);
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [permRequesting, setPermRequesting] = useState(false);

  const broadcastReady = permState?.allGranted === true;

  const refreshPermissions = useCallback(async (autoRequest: boolean) => {
    setPermChecking(true);
    try {
      let state = await checkLiveBroadcastPermissions();
      if (autoRequest && state.requestable.length > 0) {
        state = await requestLiveBroadcastPermissions();
      }
      setPermState(state);
      return state;
    } finally {
      setPermChecking(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    void refreshPermissions(true);
  }, [step, refreshPermissions]);

  useEffect(() => {
    if (step !== 3) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void refreshPermissions(false).then((state) => {
          if (state.allGranted) setPermModalVisible(false);
        });
      }
    });
    return () => sub.remove();
  }, [step, refreshPermissions]);

  const handleGrantAccess = useCallback(async () => {
    setPermRequesting(true);
    try {
      const state = await requestLiveBroadcastPermissions();
      setPermState(state);
      if (state.allGranted) {
        setPermModalVisible(false);
        return;
      }
      if (state.blocked.length > 0) {
        showToast('Turn on access in Settings, then return to PulseVerse.', 'info');
      }
    } finally {
      setPermRequesting(false);
    }
  }, [showToast]);

  const handleOpenSettings = useCallback(async () => {
    const ok = await openAppSettings();
    if (!ok) showToast('Could not open Settings.', 'error');
  }, [showToast]);

  const parsedTags = useMemo(
    () =>
      tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 8),
    [tags],
  );

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates: { height: number } }) =>
      setKeyboardBottomInset(Math.ceil(e.endCoordinates.height));
    const onHide = () => setKeyboardBottomInset(0);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const mergedTags = useMemo(() => {
    const extra: string[] = [];
    if (mode) extra.push(`${PV_LIVE_MODE_TAG_PREFIX}${mode}`);
    if (mode === 'learn' && learnTopic.trim()) {
      extra.push(`topic:${learnTopic.trim().slice(0, 24)}`);
    }
    if (!giftsEnabled) extra.push('gifts:off');
    if (scheduled) extra.push('live:scheduled');
    const room = Math.max(0, 8 - extra.length);
    const userSlice = parsedTags.slice(0, room);
    return [...extra, ...userSlice].slice(0, 8);
  }, [parsedTags, mode, learnTopic, giftsEnabled, scheduled]);

  const start = async () => {
    if (!broadcastReady) {
      setPermModalVisible(true);
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give viewers a clear title.');
      return;
    }
    if (!user?.id) {
      showToast('Sign in to go live.', 'info');
      return;
    }
    if (mode === 'shop' && !disclosuresOk) {
      Alert.alert('Disclosures', 'Confirm accurate descriptions & disclosures for commerce.');
      return;
    }
    if (scheduled && scheduleAt.getTime() <= Date.now() + 60_000) {
      Alert.alert('Schedule time', 'Pick a start time at least a few minutes from now.');
      return;
    }
    if (!mode) return;

    setCreating(true);
    try {
      const stream = await streamsLiveService.createStream({
        hostId: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category: modeToCategory(mode),
        tags: mergedTags,
        thumbnailUrl: profile?.avatarUrl || undefined,
        scheduledFor: scheduled ? scheduleAt.toISOString() : undefined,
      });

      if (!stream) {
        showToast('Couldn\u2019t start your stream. Try again.', 'error');
        return;
      }
      analytics.track(scheduled ? 'scheduled_live_created' : 'live_stream_created', {
        stream_id: stream.id,
        mode,
      });
      router.replace(liveStreamHref(stream.id));
    } catch (e) {
      if (__DEV__) console.warn('[go-live]', e);
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const previewPlaceholderMessage = permState
    ? permState.blocked.length > 0
      ? `Allow ${missingPermissionLabel(permState.missing)} in Settings to preview your stream.`
      : `Allow ${missingPermissionLabel(permState.missing)} to preview your camera before going live.`
    : 'Checking camera and microphone access…';

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom:
              insets.bottom + spacing.xl + keyboardBottomInset + (step === 2 ? spacing['2xl'] : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        nestedScrollEnabled
      >
        <Text style={styles.stepHint}>Step {step} of 3</Text>

        {step === 1 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.screenTitle}>Choose Live Type</Text>
            {MODES.map((m) => {
              const on = mode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.85}
                  style={[styles.modeCard, on && styles.modeCardOn]}
                  onPress={() => setMode(m.id)}
                >
                  <View style={styles.modeIconWrap}>
                    <Ionicons name={m.icon} size={22} color={on ? pulseverse.electric : colors.dark.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeTitle}>{m.title}</Text>
                    <Text style={styles.modeDesc}>{m.desc}</Text>
                  </View>
                  {on ? <Ionicons name="checkmark-circle" size={22} color={pulseverse.electric} /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.primaryBtn, !mode && styles.disabled]}
              disabled={!mode}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryBtnTxt}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <Text style={styles.screenTitle}>Configure Stream</Text>

            <Text style={styles.label}>Title</Text>
            <AccentComposerFrame
              accentColor={colors.primary.teal}
              compact
              noShadow
              footer={
                <AccentCharCount
                  length={title.length}
                  max={100}
                  accentColor={colors.primary.teal}
                  warnWithin={15}
                  hideWhenEmpty={false}
                />
              }
            >
              <TextInput
                style={styles.inputPlain}
                placeholder="What should viewers expect?"
                placeholderTextColor={colors.dark.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </AccentComposerFrame>

            <Text style={styles.label}>Description</Text>
            <AccentComposerFrame
              accentColor={colors.primary.teal}
              noShadow
              footer={
                <AccentCharCount
                  length={description.length}
                  max={300}
                  accentColor={colors.primary.teal}
                  warnWithin={40}
                  hideWhenEmpty={false}
                />
              }
            >
              <TextInput
                style={[styles.inputPlain, styles.inputMulti]}
                placeholder="Optional context — great for Learn / Shop streams."
                placeholderTextColor={colors.dark.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={300}
              />
            </AccentComposerFrame>

            <Text style={styles.label}>Tags</Text>
            <AccentComposerFrame accentColor={colors.primary.teal} compact noShadow>
              <TextInput
                style={styles.inputPlain}
                placeholder="nightshift, icu, scrubhaul"
                placeholderTextColor={colors.dark.textMuted}
                value={tags}
                onChangeText={setTags}
              />
            </AccentComposerFrame>

            <RowToggle label="Schedule for later" value={scheduled} onChange={setScheduled} />
            {scheduled ? (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <TouchableOpacity
                  style={styles.schedulePickBtn}
                  onPress={() => setShowSchedulePicker((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={18} color={pulseverse.electric} />
                  <Text style={styles.schedulePickTxt}>{scheduleAt.toLocaleString()}</Text>
                  <Text style={styles.schedulePickHint}>Tap to adjust</Text>
                </TouchableOpacity>
                {showSchedulePicker ? (
                  <DateTimePicker
                    value={scheduleAt}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date(Date.now() + 120_000)}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') setShowSchedulePicker(false);
                      if (date) setScheduleAt(date);
                    }}
                  />
                ) : null}
                <Text style={styles.hint}>
                  Tap Remind Me on upcoming streams — we&apos;ll send a push and in-app alert when the host goes live.
                </Text>
              </View>
            ) : null}
            <RowToggle label="Enable gifts / Sparks" value={giftsEnabled} onChange={setGiftsEnabled} />

            {mode === 'learn' ? (
              <>
                <Text style={styles.label}>Session topic</Text>
                <AccentComposerFrame accentColor={colors.primary.teal} compact noShadow>
                  <TextInput
                    style={styles.inputPlain}
                    placeholder="e.g. SBAR refresher"
                    placeholderTextColor={colors.dark.textMuted}
                    value={learnTopic}
                    onChangeText={setLearnTopic}
                  />
                </AccentComposerFrame>
                <RowToggle label="Enable Q&A queue" value={learnQna} onChange={setLearnQna} />
                <RowToggle label="Enable polls" value={learnPolls} onChange={setLearnPolls} />
                <Text style={styles.hint}>
                  Resources attachments — TODO: link Supabase Storage handouts.
                </Text>
              </>
            ) : null}

            {mode === 'shop' ? (
              <>
                <Text style={styles.label}>Product queue</Text>
                <Text style={styles.hint}>
                  TODO: bind `shop_live_product_sets` — mock SKUs ship from discovery demos only.
                </Text>
                <RowToggle label="Live deal timer (demo)" value={liveDeal} onChange={setLiveDeal} />
                <RowToggle label="Giveaway (demo)" value={giveaway} onChange={setGiveaway} />
                <RowToggle
                  label="I agree to accurate descriptions & disclosures"
                  value={disclosuresOk}
                  onChange={setDisclosuresOk}
                />
              </>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnTxt}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={styles.primaryBtnTxt}>Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            <Text style={styles.screenTitle}>Ready</Text>
            <Text style={styles.summary}>
              {MODES.find((m) => m.id === mode)?.title ?? 'Live'} · {title || 'Untitled stream'}
            </Text>

            <View style={styles.previewCard}>
              {permChecking || !permState ? (
                <View style={styles.cameraPreview}>
                  <ActivityIndicator color={pulseverse.electric} />
                  <Text style={styles.previewHint}>Checking camera and microphone…</Text>
                </View>
              ) : broadcastReady ? (
                <>
                  <CameraView ref={cameraRef} style={styles.cameraPreview} facing={facing} mode="video" />
                  <TouchableOpacity
                    style={styles.flipBtn}
                    onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
                  >
                    <Ionicons name="camera-reverse-outline" size={18} color={colors.dark.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.cameraPreview}>
                  <View style={styles.previewIconRow}>
                    <View style={[styles.previewIconOrb, permState.missing.includes('camera') && styles.previewIconOrbWarn]}>
                      <Ionicons
                        name={permState.camera.granted ? 'videocam-outline' : 'videocam-off-outline'}
                        size={28}
                        color={permState.camera.granted ? pulseverse.electricSoft : colors.dark.textMuted}
                      />
                    </View>
                    <View style={[styles.previewIconOrb, permState.missing.includes('microphone') && styles.previewIconOrbWarn]}>
                      <Ionicons
                        name={permState.microphone.granted ? 'mic-outline' : 'mic-off-outline'}
                        size={28}
                        color={permState.microphone.granted ? pulseverse.electricSoft : colors.dark.textMuted}
                      />
                    </View>
                  </View>
                  <Text style={styles.previewTitle}>Allow camera & microphone</Text>
                  <Text style={styles.previewHint}>{previewPlaceholderMessage}</Text>
                  <TouchableOpacity
                    style={styles.previewCta}
                    onPress={() => {
                      if (permState.blocked.length > 0) void handleOpenSettings();
                      else setPermModalVisible(true);
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.previewCtaTxt}>
                      {permState.blocked.length > 0 ? 'Open Settings' : 'Grant Access'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {!broadcastReady ? (
              <Text style={styles.permGateHint}>
                Go Live unlocks after camera and microphone access are granted.
              </Text>
            ) : null}

            <Text style={styles.disclaimer}>
              Mobile broadcast uses LiveKit on development / EAS builds (not Expo Go). Chat, gifts, polls stay on Supabase.
            </Text>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                <Text style={styles.secondaryBtnTxt}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.startBtn,
                  { flex: 1 },
                  (creating || !broadcastReady) && styles.disabled,
                ]}
                onPress={start}
                disabled={creating || !broadcastReady}
              >
                {creating ? (
                  <ActivityIndicator color={colors.dark.text} />
                ) : (
                  <>
                    <View style={styles.startDot} />
                    <Text style={styles.startText}>{scheduled ? 'Schedule Session' : 'Go Live'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <LiveBroadcastPermissionModal
        visible={permModalVisible}
        missing={permState?.missing ?? ['camera', 'microphone']}
        blocked={permState?.blocked ?? []}
        requesting={permRequesting}
        onGrantAccess={handleGrantAccess}
        onOpenSettings={handleOpenSettings}
        onCancel={() => setPermModalVisible(false)}
      />
    </>
  );
}

function RowToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#334155', true: pulseverse.electric + '88' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: layout.screenPadding },
  stepHint: { ...typography.caption, color: colors.dark.textMuted, marginBottom: spacing.sm },
  screenTitle: { ...typography.h3, fontSize: 22, color: colors.dark.text, marginBottom: spacing.md },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  modeCardOn: {
    borderColor: pulseverse.electric + '88',
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  modeTitle: { ...typography.h3, fontSize: 16, color: colors.dark.text },
  modeDesc: { ...typography.bodySmall, color: colors.dark.textMuted, marginTop: 4, lineHeight: 18 },

  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: pulseverse.electric,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnTxt: { ...typography.button, fontWeight: '800', color: colors.dark.bg },
  secondaryBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnTxt: { ...typography.button, color: colors.dark.textSecondary },
  disabled: { opacity: 0.45 },

  label: {
    ...typography.label,
    color: colors.dark.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  inputPlain: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.dark.text,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  hint: { ...typography.bodySmall, color: colors.dark.textMuted, marginTop: spacing.sm },
  schedulePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  schedulePickTxt: { ...typography.body, color: colors.dark.text, flex: 1 },
  schedulePickHint: { ...typography.caption, color: colors.dark.textMuted, width: '100%' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  toggleLabel: { flex: 1, ...typography.body, color: colors.dark.text, paddingRight: spacing.md },

  summary: { ...typography.body, color: colors.dark.textSecondary, marginBottom: spacing.md },

  previewCard: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    ...shadows.card,
  },
  cameraPreview: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#020617',
    paddingHorizontal: spacing.lg,
  },
  previewIconRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  previewIconOrb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  previewIconOrbWarn: {
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(127,29,29,0.15)',
  },
  previewTitle: {
    ...typography.h3,
    fontSize: 17,
    color: colors.dark.text,
    textAlign: 'center',
  },
  previewHint: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  previewCta: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    ...shadows.ctaSoft,
  },
  previewCtaTxt: {
    ...typography.button,
    fontWeight: '800',
    color: pulseverse.onElectric,
  },
  permGateHint: {
    ...typography.bodySmall,
    color: colors.status.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  flipBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.status.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dark.text,
  },
  startText: { ...typography.button, fontSize: 16, fontWeight: '800', color: colors.dark.text },

  disclaimer: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
    lineHeight: 18,
  },
});
