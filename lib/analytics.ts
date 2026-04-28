import { supabase } from './supabase';

type EventName =
  | 'app_open'
  | 'screen_view'
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'post_created'
  | 'post_liked'
  | 'post_saved'
  | 'post_shared'
  | 'post_pinned_to_my_pulse'
  | 'post_media_download_raw'
  | 'media_export_start'
  | 'media_export_complete'
  | 'media_export_fail'
  | 'comment_created'
  | 'job_viewed'
  | 'job_saved'
  | 'community_joined'
  | 'community_left'
  | 'profile_viewed'
  | 'search_performed'
  | 'notification_tapped'
  | 'report_submitted';

class AnalyticsService {
  private userId: string | null = null;
  private queue: Array<{ event_name: string; event_data: any; screen?: string }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  setUser(userId: string | null) {
    this.userId = userId;
  }

  track(eventName: EventName, data?: Record<string, unknown>, screen?: string) {
    this.queue.push({
      event_name: eventName,
      event_data: data ?? {},
      screen,
    });

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 5000);
    }

    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (!this.userId || this.queue.length === 0) return;

    const events = this.queue.splice(0);
    const rows = events.map((e) => ({
      user_id: this.userId!,
      ...e,
    }));

    try {
      await supabase.from('analytics_events').insert(rows);
    } catch {
      this.queue.unshift(...events);
    }
  }

  screenView(screenName: string) {
    this.track('screen_view', { screen_name: screenName }, screenName);
  }
}

export const analytics = new AnalyticsService();
