import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

export type CirclePostSettings = {
  shareToMyPulse: boolean;
  allowComments: boolean;
  /** Pin to circle highlights — kept off / disabled for non-permitted users. */
  pinToHighlights: boolean;
};

type Props = {
  settings: CirclePostSettings;
  /** When true, the Pin row renders. Kept off-screen for regular members
   *  so the card doesn't show a permanently disabled control — cleaner
   *  than greying out a row most users will never use. */
  canPin?: boolean;
  onChange: (next: Partial<CirclePostSettings>) => void;
};

/**
 * Premium settings stack for the create flow. The "Share to My Pulse"
 * toggle is the key differentiator — it's the bridge from the circle to
 * the user's Pulse Page so visitors can find the conversation later.
 *
 * Visual hierarchy:
 *  - Share to My Pulse is promoted into a featured card with an accent
 *    border + secondary "active state" hint. It's the row that makes
 *    PulseVerse circles distinct from Reddit, so we lean into it.
 *  - Allow comments is a normal row.
 *  - Pin to Highlights only renders for circle hosts (canPin) — no
 *    permanently-disabled rows for regular members.
 *  - The Circle confirmation row is replaced by the dedicated
 *    CircleContextFooter so we don't duplicate that information.
 */
export function CircleSettingsCard({
  settings,
  canPin = false,
  onChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>POST SETTINGS</Text>

      {/* Featured Share to My Pulse row — promoted card with a teal halo
          when active, so the connection to the user's profile reads as
          intentional and important rather than a buried toggle. */}
      <View
        style={[
          styles.featureRow,
          settings.shareToMyPulse && styles.featureRowActive,
        ]}
      >
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary.teal}22` }]}>
            <Ionicons name="pulse" size={18} color={colors.primary.teal} />
          </View>
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Share to My Pulse</Text>
              {settings.shareToMyPulse ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ON</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.subtitle}>
              Expand your post beyond the circle
            </Text>
            {settings.shareToMyPulse ? (
              <Text style={styles.activeHint}>
                Visitors to your Pulse Page will see a link back to this thread.
              </Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Switch
              value={settings.shareToMyPulse}
              onValueChange={(v) => onChange({ shareToMyPulse: v })}
              trackColor={{ false: colors.dark.border, true: colors.primary.teal }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      <SettingRow
        iconBg={`${colors.primary.royal}22`}
        icon={
          <Ionicons name="chatbubbles-outline" size={18} color={colors.primary.royal} />
        }
        title="Allow comments"
        subtitle="Let members comment on your post"
        right={
          <Switch
            value={settings.allowComments}
            onValueChange={(v) => onChange({ allowComments: v })}
            trackColor={{ false: colors.dark.border, true: colors.primary.royal }}
            thumbColor="#FFFFFF"
          />
        }
      />

      {canPin ? (
        <SettingRow
          iconBg={`${colors.primary.gold}22`}
          icon={
            <Ionicons name="star-outline" size={18} color={colors.primary.gold} />
          }
          title="Pin to Circle Highlights"
          subtitle="Feature this post in the circle highlights"
          right={
            <Switch
              value={settings.pinToHighlights}
              onValueChange={(v) => onChange({ pinToHighlights: v })}
              trackColor={{ false: colors.dark.border, true: colors.primary.gold }}
              thumbColor="#FFFFFF"
            />
          }
        />
      ) : null}
    </View>
  );
}

function SettingRow({
  iconBg,
  icon,
  title,
  subtitle,
  right,
  disabled,
  onPress,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  right: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const Inner = (
    <View style={[styles.row, disabled && { opacity: 0.55 }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
  if (!onPress || disabled) return Inner;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {Inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    gap: 4,
    /* Soft elevation pulls the settings stack off the page so it reads
       as a unified group, not a flat list. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  section: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark.textMuted,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  /** Featured row treatment for the Share to My Pulse toggle — wraps
   *  the standard row in a subtle teal-tinted card when active. The
   *  goal: communicate that this row is the bridge to the user's
   *  Pulse Page (not just another switch). */
  featureRow: {
    borderRadius: 12,
    paddingHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  featureRowActive: {
    backgroundColor: `${colors.primary.teal}0F`,
    borderColor: `${colors.primary.teal}3A`,
    paddingHorizontal: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.1 },
  subtitle: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  /** Tiny "ON" badge that appears next to the Share to My Pulse title
   *  when the toggle is active — gives the row instant visual feedback
   *  beyond the switch state. */
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: `${colors.primary.teal}22`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.primary.teal}55`,
  },
  activeBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: colors.primary.teal,
    letterSpacing: 0.6,
  },
  /** Inline confirmation copy that surfaces when Share to My Pulse is
   *  active — explains exactly what will happen so the user trusts it. */
  activeHint: {
    fontSize: 11.5,
    color: `${colors.primary.teal}DD`,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  right: { marginLeft: 6 },
});
