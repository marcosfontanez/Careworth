import { supabase } from '@/lib/supabase';

export interface CollabProjectRow {
  id: string;
  host_creator_id: string;
  title: string;
  status: 'draft' | 'collecting' | 'stitching' | 'done' | 'cancelled';
  result_storage_path: string | null;
  published_post_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollabSlotRow {
  id: string;
  project_id: string;
  slot_index: number;
  max_duration_sec: number;
  invite_id: string | null;
  invitee_user_id: string | null;
  submitted_storage_path: string | null;
  status: 'empty' | 'invited' | 'submitted';
}

export const collabProjectsService = {
  async createProject(hostId: string, title = 'Co-create'): Promise<CollabProjectRow> {
    const { data, error } = await supabase
      .from('collab_projects')
      .insert({ host_creator_id: hostId, title, status: 'draft' })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('create project failed');
    return data as CollabProjectRow;
  },

  async addSlots(projectId: string, count: number, maxSec = 10): Promise<void> {
    const rows = Array.from({ length: count }, (_, i) => ({
      project_id: projectId,
      slot_index: i,
      max_duration_sec: maxSec,
      status: 'empty',
    }));
    const { error } = await supabase.from('collab_slots').insert(rows);
    if (error) throw error;
  },

  async listMyProjects(hostId: string): Promise<CollabProjectRow[]> {
    const { data, error } = await supabase
      .from('collab_projects')
      .select('*')
      .eq('host_creator_id', hostId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CollabProjectRow[];
  },

  async getProject(projectId: string): Promise<CollabProjectRow | null> {
    const { data, error } = await supabase.from('collab_projects').select('*').eq('id', projectId).maybeSingle();
    if (error) throw error;
    return data as CollabProjectRow | null;
  },

  async listSlots(projectId: string): Promise<CollabSlotRow[]> {
    const { data, error } = await supabase
      .from('collab_slots')
      .select('*')
      .eq('project_id', projectId)
      .order('slot_index', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CollabSlotRow[];
  },

  async assignInvitee(slotId: string, inviteeUserId: string): Promise<void> {
    const { error } = await supabase
      .from('collab_slots')
      .update({ invitee_user_id: inviteeUserId, status: 'invited' })
      .eq('id', slotId);
    if (error) throw error;
  },

  async submitSlotClip(slotId: string, storagePath: string): Promise<void> {
    const { error } = await supabase
      .from('collab_slots')
      .update({ submitted_storage_path: storagePath, status: 'submitted' })
      .eq('id', slotId);
    if (error) throw error;
  },
};
