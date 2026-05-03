import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { collabProjectsService } from '@/services/supabase';
import type { CollabProjectRow, CollabSlotRow } from '@/services/supabase/collabProjects';
import { useToast } from '@/components/ui/Toast';
import { CollabInviteeSearchModal } from '@/components/create/CollabInviteeSearchModal';
import { pickVideoFromGallery } from '@/lib/media';
import { storageService } from '@/lib/storage';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function CollabProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [project, setProject] = useState<CollabProjectRow | null>(null);
  const [slots, setSlots] = useState<CollabSlotRow[]>([]);
  const [inviteUserId, setInviteUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pickerForSlotId, setPickerForSlotId] = useState<string | null>(null);
  const [showAdvancedUuid, setShowAdvancedUuid] = useState(false);
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        collabProjectsService.getProject(projectId),
        collabProjectsService.listSlots(projectId),
      ]);
      setProject(p);
      setSlots(s);
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Load failed', 'error');
      setProject(null);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const isHost = Boolean(user?.id && project?.host_creator_id === user.id);

  const excludeInviteeSearchIds = useMemo(() => {
    const set = new Set<string>();
    if (user?.id) set.add(user.id);
    return set;
  }, [user?.id]);

  const hasInviteeAccess = useMemo(
    () => Boolean(user?.id && slots.some((s) => s.invitee_user_id === user.id)),
    [user?.id, slots],
  );

  const assignWithUserId = async (slot: CollabSlotRow, inviteeId: string) => {
    const raw = inviteeId.trim();
    if (!raw || !UUID_RE.test(raw)) {
      toast.show('Invalid profile id', 'error');
      return;
    }
    if (raw === project?.host_creator_id) {
      toast.show('Pick someone other than yourself', 'info');
      return;
    }
    try {
      await collabProjectsService.assignInvitee(slot.id, raw);
      toast.show('Collaborator assigned', 'success');
      setInviteUserId((prev) => ({ ...prev, [slot.id]: '' }));
      await load();
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Assign failed', 'error');
    }
  };

  const assign = async (slot: CollabSlotRow) => {
    const raw = (inviteUserId[slot.id] ?? '').trim();
    if (!raw) {
      toast.show('Search for someone or paste their user id', 'info');
      return;
    }
    await assignWithUserId(slot, raw);
  };

  const onInviteeUpload = async (slot: CollabSlotRow) => {
    if (!user?.id || !projectId) return;
    if (slot.invitee_user_id !== user.id) return;
    if (slot.status === 'submitted' && slot.submitted_storage_path) {
      toast.show('This slot already has a clip. Re-upload clears on replace later.', 'info');
    }
    try {
      const asset = await pickVideoFromGallery();
      if (!asset) return;
      setUploadingSlotId(slot.id);
      const path = await storageService.uploadCollabSlotClip({
        inviteeUserId: user.id,
        projectId,
        slotId: slot.id,
        file: { uri: asset.uri, type: asset.mimeType, name: asset.fileName },
      });
      await collabProjectsService.submitSlotClip(slot.id, path);
      toast.show('Clip uploaded', 'success');
      await load();
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploadingSlotId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary.teal} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingHorizontal: layout.screenPadding }]}>
        <Text style={styles.muted}>
          This project isn’t available. Ask the host for a new link or confirm you’re signed into the invited account
          (database migration 096 adds invitee access).
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isHost && !hasInviteeAccess) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingHorizontal: layout.screenPadding }]}>
        <Text style={styles.muted}>You’re not assigned to this co-create project.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CollabInviteeSearchModal
        visible={pickerForSlotId != null}
        onClose={() => setPickerForSlotId(null)}
        excludeUserIds={excludeInviteeSearchIds}
        onSelect={(id) => {
          if (!pickerForSlotId) return;
          const slot = slots.find((s) => s.id === pickerForSlotId);
          if (slot) void assignWithUserId(slot, id);
          setPickerForSlotId(null);
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.meta}>
          {isHost
            ? 'Assign each slot to a collaborator. They upload a short clip here. Final stitching still runs in your creator media worker when you enqueue a stitch job.'
            : 'Upload your clip for the slot you were assigned. Max length is a guide — the full file uploads today.'}
        </Text>
        {slots.map((slot) => (
          <View key={slot.id} style={styles.slot}>
            <Text style={styles.slotTitle}>Slot {slot.slot_index + 1}</Text>
            <Text style={styles.slotSub}>
              Max ~{slot.max_duration_sec}s · {slot.status}
              {slot.submitted_storage_path ? ' · clip saved' : ''}
            </Text>
            {isHost ? (
              <View style={styles.hostActions}>
                <TouchableOpacity
                  style={styles.searchPeopleBtn}
                  onPress={() => setPickerForSlotId(slot.id)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="person-add-outline" size={18} color={colors.primary.teal} />
                  <Text style={styles.searchPeopleText}>Search people</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAdvancedUuid((v) => !v)}
                  style={styles.advancedToggle}
                >
                  <Text style={styles.advancedToggleText}>{showAdvancedUuid ? 'Hide' : 'Advanced'} · paste user id</Text>
                </TouchableOpacity>
                {showAdvancedUuid ? (
                  <View style={styles.row}>
                    <TextInput
                      style={styles.input}
                      placeholder="uuid…"
                      placeholderTextColor={colors.dark.textMuted}
                      value={inviteUserId[slot.id] ?? ''}
                      onChangeText={(t) => setInviteUserId((prev) => ({ ...prev, [slot.id]: t }))}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.assignBtn} onPress={() => assign(slot)}>
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {slot.invitee_user_id ? (
                  <Text style={styles.assignedMeta}>Assigned · {slot.invitee_user_id.slice(0, 8)}…</Text>
                ) : null}
              </View>
            ) : slot.invitee_user_id === user?.id ? (
              <View style={styles.inviteeActions}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => onInviteeUpload(slot)}
                  disabled={uploadingSlotId === slot.id}
                  activeOpacity={0.88}
                >
                  {uploadingSlotId === slot.id ? (
                    <ActivityIndicator size="small" color={colors.dark.text} />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={20} color={colors.dark.text} />
                  )}
                  <Text style={styles.uploadBtnText}>
                    {slot.submitted_storage_path ? 'Replace video' : 'Upload video clip'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text, flex: 1, textAlign: 'center' },
  body: { padding: layout.screenPadding, gap: 14, paddingBottom: 80 },
  meta: { fontSize: 12, color: colors.dark.textSecondary, lineHeight: 18 },
  muted: { fontSize: 14, color: colors.dark.textSecondary, lineHeight: 20 },
  backBtn: { marginTop: 20, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border },
  backBtnText: { fontWeight: '800', color: colors.primary.teal },
  slot: {
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 8,
  },
  slotTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  slotSub: { fontSize: 12, color: colors.dark.textMuted },
  hostActions: { gap: 8, marginTop: 4 },
  searchPeopleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primary.teal + '22',
    borderWidth: 1,
    borderColor: colors.primary.teal + '55',
  },
  searchPeopleText: { fontSize: 13, fontWeight: '800', color: colors.primary.teal },
  advancedToggle: { paddingVertical: 4 },
  advancedToggleText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted },
  assignedMeta: { fontSize: 11, color: colors.dark.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.dark.text,
    fontSize: 13,
  },
  assignBtn: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primary.teal,
  },
  assignBtnText: { fontSize: 12, fontWeight: '800', color: colors.dark.text },
  inviteeActions: { marginTop: 6 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary.teal,
  },
  uploadBtnText: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
});
