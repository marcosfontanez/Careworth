import { supabase } from '@/lib/supabase';
import type { Job } from '@/types';

function rowToJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    employerName: row.employer_name,
    employerLogo: row.employer_logo,
    city: row.city,
    state: row.state,
    role: row.role,
    specialty: row.specialty,
    payMin: row.pay_min,
    payMax: row.pay_max,
    shift: row.shift,
    employmentType: row.employment_type,
    description: row.description,
    requirements: row.requirements ?? [],
    benefits: row.benefits ?? [],
    isSaved: false,
    isFeatured: row.is_featured,
    isNew: row.is_new,
    createdAt: row.created_at,
  };
}

export const jobsService = {
  async getAll(filters?: { specialty?: string; role?: string }): Promise<Job[]> {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.specialty && filters.specialty !== 'All Jobs') {
      query = query.eq('specialty', filters.specialty);
    }
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToJob);
  },

  async search(query: string, limit = 40): Promise<Job[]> {
    const q = query.trim();
    if (!q) return [];
    const safe = q.replace(/%/g, '').replace(/,/g, ' ');
    const pattern = `%${safe}%`;
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .or(`title.ilike.${pattern},employer_name.ilike.${pattern},specialty.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(rowToJob);
  },

  async getById(id: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return rowToJob(data);
  },

  async toggleSave(userId: string, jobId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .single();

    if (existing) {
      await supabase.from('saved_jobs').delete().eq('id', existing.id);
      return false;
    } else {
      await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId });
      return true;
    }
  },

  async getSaved(userId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('job_id, jobs(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...rowToJob(r.jobs),
      isSaved: true,
    }));
  },
};
