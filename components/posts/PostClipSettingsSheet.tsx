import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { PostClipPermissionToggles, type PostClipPermissionValues } from '@/components/create/PostClipPermissionToggles';
import { PulseButton } from '@/components/ui/pulse/PulseButton';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

type Props = {
  visible: boolean;
  values: PostClipPermissionValues;
  saving?: boolean;
  onChange: (patch: Partial<PostClipPermissionValues>) => void;
  onSave: () => void;
  onClose: () => void;
};

/** Owner post-edit sheet for clip/remix/download permissions. */
export function PostClipSettingsSheet({
  visible,
  values,
  saving = false,
  onChange,
  onSave,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Clip & reuse settings</Text>
          <Text style={styles.subtitle}>Control how others can clip, remix, or download this video.</Text>

          <PostClipPermissionToggles values={values} onChange={onChange} disabled={saving} />

          <View style={styles.actions}>
            <PulseButton
              label={saving ? 'Saving…' : 'Save settings'}
              onPress={onSave}
              disabled={saving}
              fullWidth
            />
            <PulseButton label="Cancel" onPress={onClose} variant="ghost" fullWidth />
          </View>
          {saving ? (
            <ActivityIndicator color={pulseColors.teal} style={styles.spinner} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: pulseColors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: pulseRadius.sheet,
    borderTopRightRadius: pulseRadius.sheet,
    backgroundColor: pulseColors.glassStrong,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: pulseColors.borderAccent,
    paddingHorizontal: pulseSpacing.xl,
    paddingTop: pulseSpacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 36 : pulseSpacing.xl,
    gap: pulseSpacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: pulseSpacing.xs,
  },
  title: { ...pulseTypography.sectionTitle, fontSize: 20 },
  subtitle: { ...pulseTypography.bodySmall, color: pulseColors.mutedText },
  actions: { gap: pulseSpacing.sm, marginTop: pulseSpacing.sm },
  spinner: { marginTop: pulseSpacing.xs },
});
