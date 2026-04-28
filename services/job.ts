import type { Job } from '@/types';
import { jobsService } from './supabase';
import { supabase } from '@/lib/supabase';

export const jobService = {
  async getAll(): Promise<Job[]> {
    return jobsService.getAll();
  },

  async getById(id: string): Promise<Job | undefined> {
    const live = await jobsService.getById(id);
    return live ?? undefined;
  },

  async getFeatured(): Promise<Job[]> {
    const live = await jobsService.getAll();
    return live.filter((j) => j.isFeatured);
  },

  async search(query: string): Promise<Job[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      return await jobsService.search(q);
    } catch {
      return [];
    }
  },

  async toggleSave(jobId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return jobsService.toggleSave(user.id, jobId);
  },

  async getSaved(): Promise<Job[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    return jobsService.getSaved(user.id);
  },
};
