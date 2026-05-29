import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PulseEmptyState, PulseGlassCard, PulseSectionHeader } from '@/components/ui/pulse';
import { pulseSpacing } from '@/lib/theme/pulseTheme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof PulseSectionHeader>['icon'];
  children: React.ReactNode;
  fill?: boolean;
};

/** Elevated panel shell for Live Studio tab content. */
export function StreamManagerPanelShell({
  title,
  subtitle,
  icon,
  children,
  fill = false,
}: Props) {
  return (
    <PulseGlassCard style={[styles.shell, fill && styles.shellFill]} padded>
      <PulseSectionHeader title={title} subtitle={subtitle} icon={icon} style={styles.header} />
      <View style={[styles.body, fill && styles.bodyFill]}>{children}</View>
    </PulseGlassCard>
  );
}

type EmptyProps = {
  icon: React.ComponentProps<typeof PulseEmptyState>['icon'];
  title: string;
  message: string;
};

export function LiveManagerEmptyState({ icon, title, message }: EmptyProps) {
  return <PulseEmptyState icon={icon} title={title} message={message} style={styles.empty} />;
}

const styles = StyleSheet.create({
  shell: { marginBottom: 0 },
  shellFill: { flex: 1, minHeight: 0 },
  header: { marginBottom: pulseSpacing.sm, paddingVertical: 0 },
  body: { minHeight: 80 },
  bodyFill: { flex: 1, minHeight: 0 },
  empty: { paddingVertical: pulseSpacing['2xl'] },
});
