export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          first_name: string;
          last_name: string | null;
          username: string | null;
          role: string;
          specialty: string;
          city: string;
          state: string;
          years_experience: number;
          bio: string;
          avatar_url: string | null;
          follower_count: number;
          following_count: number;
          like_count: number;
          post_count: number;
          privacy_mode: string;
          shift_preference: string;
          is_verified: boolean;
          role_admin: boolean;
          push_token: string | null;
          push_token_updated_at: string | null;
          pulse_tier: string;
          pulse_score_current: number;
          hide_recent_posts_on_my_page: boolean;
          preferred_locale: string;
          product_digest_email: boolean;
          created_at: string;
          updated_at: string;
          profile_song_title: string | null;
          profile_song_artist: string | null;
          profile_song_url: string | null;
        };
        Insert: {
          id: string;
          display_name: string;
          first_name: string;
          last_name?: string | null;
          username?: string | null;
          role?: string;
          specialty?: string;
          city?: string;
          state?: string;
          years_experience?: number;
          bio?: string;
          avatar_url?: string | null;
          follower_count?: number;
          following_count?: number;
          like_count?: number;
          post_count?: number;
          privacy_mode?: string;
          shift_preference?: string;
          is_verified?: boolean;
          role_admin?: boolean;
          push_token?: string | null;
          push_token_updated_at?: string | null;
          pulse_tier?: string;
          pulse_score_current?: number;
          hide_recent_posts_on_my_page?: boolean;
          preferred_locale?: string;
          product_digest_email?: boolean;
          profile_song_title?: string | null;
          profile_song_artist?: string | null;
          profile_song_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          creator_id: string;
          type: string;
          caption: string;
          media_url: string | null;
          thumbnail_url: string | null;
          additional_media: string[] | null;
          hashtags: string[];
          communities: string[];
          is_anonymous: boolean;
          privacy_mode: string;
          like_count: number;
          comment_count: number;
          share_count: number;
          view_count: number;
          save_count: number;
          ranking_score: number;
          feed_type_eligible: string[];
          role_context: string;
          specialty_context: string;
          location_context: string;
          duet_parent_id: string | null;
          evidence_url: string | null;
          evidence_label: string | null;
          shift_context: string | null;
          edited_at: string | null;
          created_at: string;
          sound_title: string | null;
          sound_source_post_id: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          type: string;
          caption: string;
          media_url?: string | null;
          thumbnail_url?: string | null;
          additional_media?: string[] | null;
          hashtags?: string[];
          communities?: string[];
          is_anonymous?: boolean;
          privacy_mode?: string;
          role_context?: string;
          specialty_context?: string;
          location_context?: string;
          duet_parent_id?: string | null;
          evidence_url?: string | null;
          evidence_label?: string | null;
          shift_context?: string | null;
          edited_at?: string | null;
          sound_title?: string | null;
          sound_source_post_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['posts']['Insert']>;
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          accent_color: string;
          banner_url: string | null;
          member_count: number;
          post_count: number;
          categories: string[];
          trending_topics: string[];
          created_at: string;
          featured_order: number | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          icon?: string;
          accent_color?: string;
          banner_url?: string | null;
          categories?: string[];
          trending_topics?: string[];
          featured_order?: number | null;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string;
          icon?: string;
          accent_color?: string;
          banner_url?: string | null;
          categories?: string[];
          trending_topics?: string[];
          member_count?: number;
          post_count?: number;
          featured_order?: number | null;
        };
        Relationships: [];
      };
      community_post_pins: {
        Row: {
          id: string;
          community_id: string;
          post_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          post_id: string;
          sort_order?: number;
        };
        Update: {
          community_id?: string;
          post_id?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      community_members: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['community_members']['Insert']>;
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          title: string;
          employer_name: string;
          employer_logo: string | null;
          city: string;
          state: string;
          role: string;
          specialty: string;
          pay_min: number;
          pay_max: number;
          shift: string;
          employment_type: string;
          description: string;
          requirements: string[];
          benefits: string[];
          is_featured: boolean;
          is_new: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          employer_name: string;
          employer_logo?: string | null;
          city?: string;
          state?: string;
          role?: string;
          specialty?: string;
          pay_min?: number;
          pay_max?: number;
          shift?: string;
          employment_type?: string;
          description?: string;
          requirements?: string[];
          benefits?: string[];
          is_featured?: boolean;
          is_new?: boolean;
        };
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
        Relationships: [];
      };
      saved_jobs: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
        };
        Update: Partial<Database['public']['Tables']['saved_jobs']['Insert']>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          parent_id: string | null;
          content: string;
          like_count: number;
          is_pinned: boolean;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          is_pinned?: boolean;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['comments']['Insert']>;
        Relationships: [];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
        };
        Update: Partial<Database['public']['Tables']['follows']['Insert']>;
        Relationships: [];
      };
      post_likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
        };
        Update: Partial<Database['public']['Tables']['post_likes']['Insert']>;
        Relationships: [];
      };
      saved_posts: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
        };
        Update: Partial<Database['public']['Tables']['saved_posts']['Insert']>;
        Relationships: [];
      };
      saved_sounds: {
        Row: {
          id: string;
          user_id: string;
          source_post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_post_id: string;
        };
        Update: Partial<Database['public']['Tables']['saved_sounds']['Insert']>;
        Relationships: [];
      };
      sound_catalog: {
        Row: {
          id: string;
          post_id: string;
          artist: string | null;
          keywords: string | null;
          sort_boost: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          artist?: string | null;
          keywords?: string | null;
          sort_boost?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['sound_catalog']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          actor_id: string;
          message: string;
          target_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          /** System notifications may use the recipient id when no human actor applies. */
          actor_id?: string;
          message: string;
          target_id?: string | null;
          read?: boolean;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          color: string;
          category: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon?: string;
          color?: string;
          category?: string;
        };
        Update: Partial<Database['public']['Tables']['badges']['Insert']>;
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
        };
        Update: Partial<Database['public']['Tables']['user_badges']['Insert']>;
        Relationships: [];
      };
      user_interests: {
        Row: {
          id: string;
          user_id: string;
          interest: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          interest: string;
        };
        Update: Partial<Database['public']['Tables']['user_interests']['Insert']>;
        Relationships: [];
      };

      ad_campaigns: {
        Row: {
          id: string;
          advertiser_name: string;
          advertiser_logo: string | null;
          title: string;
          description: string;
          media_url: string;
          cta_label: string;
          cta_url: string;
          target_roles: string[] | null;
          target_specialties: string[] | null;
          target_states: string[] | null;
          budget_total: number;
          budget_spent: number;
          cpm_rate: number;
          start_date: string;
          end_date: string;
          status: string;
          impressions: number;
          clicks: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          advertiser_name: string;
          advertiser_logo?: string | null;
          title: string;
          description?: string;
          media_url: string;
          cta_label?: string;
          cta_url: string;
          target_roles?: string[] | null;
          target_specialties?: string[] | null;
          target_states?: string[] | null;
          budget_total?: number;
          budget_spent?: number;
          cpm_rate?: number;
          start_date?: string;
          end_date: string;
          status?: string;
          impressions?: number;
          clicks?: number;
        };
        Update: Partial<Database['public']['Tables']['ad_campaigns']['Insert']>;
        Relationships: [];
      };

      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          event_data: Json;
          screen: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          event_data?: Json;
          screen?: string | null;
        };
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>;
        Relationships: [];
      };

      blocked_users: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
        };
        Update: Partial<Database['public']['Tables']['blocked_users']['Insert']>;
        Relationships: [];
      };

      career_milestones: {
        Row: {
          id: string;
          user_id: string;
          milestone_type: string;
          title: string;
          description: string | null;
          earned_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          milestone_type: string;
          title: string;
          description?: string | null;
        };
        Update: Partial<Database['public']['Tables']['career_milestones']['Insert']>;
        Relationships: [];
      };

      circle_threads: {
        Row: {
          id: string;
          community_id: string;
          author_id: string;
          kind: string;
          title: string;
          body: string;
          media_thumb_url: string | null;
          linked_post_id: string | null;
          reply_count: number;
          reaction_count: number;
          share_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          author_id: string;
          kind: string;
          title: string;
          body?: string;
          media_thumb_url?: string | null;
          linked_post_id?: string | null;
          reply_count?: number;
          reaction_count?: number;
          share_count?: number;
        };
        Update: Partial<Database['public']['Tables']['circle_threads']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'circle_threads_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
        ];
      };

      circle_replies: {
        Row: {
          id: string;
          thread_id: string;
          author_id: string;
          body: string;
          reaction_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          author_id: string;
          body: string;
          reaction_count?: number;
        };
        Update: Partial<Database['public']['Tables']['circle_replies']['Insert']>;
        Relationships: [];
      };

      comment_likes: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['comment_likes']['Insert']>;
        Relationships: [];
      };

      content_appeals: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          message?: string;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['content_appeals']['Insert']>;
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          participant_1: string;
          participant_2: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_1: string;
          participant_2: string;
          last_message_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };

      creator_earnings: {
        Row: {
          id: string;
          creator_id: string;
          total_tips: number;
          total_views: number;
          total_likes: number;
          monthly_earnings: number;
          lifetime_earnings: number;
          pending_payout: number;
          last_payout_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          total_tips?: number;
          total_views?: number;
          total_likes?: number;
          monthly_earnings?: number;
          lifetime_earnings?: number;
          pending_payout?: number;
          last_payout_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['creator_earnings']['Insert']>;
        Relationships: [];
      };

      creator_tips: {
        Row: {
          id: string;
          from_user_id: string;
          to_creator_id: string;
          amount: number;
          message: string | null;
          post_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_creator_id: string;
          amount: number;
          message?: string | null;
          post_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['creator_tips']['Insert']>;
        Relationships: [];
      };

      feed_user_actions: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          post_id: string | null;
          creator_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          post_id?: string | null;
          creator_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['feed_user_actions']['Insert']>;
        Relationships: [];
      };

      host_earnings: {
        Row: {
          id: string;
          host_id: string;
          stream_id: string;
          sender_id: string | null;
          source: string;
          coins: number;
          gift_id: string | null;
          gift_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          stream_id: string;
          sender_id?: string | null;
          source?: string;
          coins: number;
          gift_id?: string | null;
          gift_name?: string | null;
        };
        Update: Partial<Database['public']['Tables']['host_earnings']['Insert']>;
        Relationships: [];
      };

      host_earnings_totals: {
        Row: {
          host_id: string;
          total_coins: number;
          total_gifts: number;
          last_gift_at: string | null;
          updated_at: string;
        };
        Insert: {
          host_id: string;
          total_coins?: number;
          total_gifts?: number;
          last_gift_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['host_earnings_totals']['Insert']>;
        Relationships: [];
      };

      job_applications: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          cover_letter: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          cover_letter?: string | null;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['job_applications']['Insert']>;
        Relationships: [];
      };

      job_postings: {
        Row: {
          id: string;
          job_id: string;
          employer_id: string;
          tier: string;
          paid_amount: number;
          expires_at: string;
          status: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          employer_id: string;
          tier: string;
          paid_amount?: number;
          expires_at: string;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['job_postings']['Insert']>;
        Relationships: [];
      };

      live_streams: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string | null;
          category: string;
          thumbnail_url: string | null;
          status: string;
          viewer_count: number | null;
          peak_viewer_count: number | null;
          started_at: string | null;
          scheduled_for: string | null;
          ended_at: string | null;
          tags: string[] | null;
          community_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          description?: string | null;
          category?: string;
          thumbnail_url?: string | null;
          status?: string;
          viewer_count?: number | null;
          peak_viewer_count?: number | null;
          started_at?: string | null;
          scheduled_for?: string | null;
          ended_at?: string | null;
          tags?: string[] | null;
          community_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['live_streams']['Insert']>;
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };

      payout_requests: {
        Row: {
          id: string;
          creator_id: string;
          amount: number | null;
          status: string;
          created_at: string | null;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          amount?: number | null;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['payout_requests']['Insert']>;
        Relationships: [];
      };

      post_shares: {
        Row: {
          id: string;
          user_id: string | null;
          post_id: string;
          channel: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          post_id: string;
          channel?: string | null;
        };
        Update: Partial<Database['public']['Tables']['post_shares']['Insert']>;
        Relationships: [];
      };

      post_views: {
        Row: {
          id: string;
          post_id: string;
          viewer_id: string;
          view_duration_ms: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          viewer_id: string;
          view_duration_ms?: number | null;
        };
        Update: Partial<Database['public']['Tables']['post_views']['Insert']>;
        Relationships: [];
      };

      profile_updates: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          content: string;
          preview_text: string | null;
          mood: string | null;
          linked_post_id: string | null;
          linked_circle_id: string | null;
          linked_circle_slug: string | null;
          linked_discussion_title: string | null;
          linked_thread_id: string | null;
          linked_live_id: string | null;
          media_thumb: string | null;
          linked_url: string | null;
          pics_urls: string[] | null;
          like_count: number;
          comment_count: number;
          share_count: number;
          is_pinned: boolean;
          edited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          content: string;
          preview_text?: string | null;
          mood?: string | null;
          linked_post_id?: string | null;
          linked_circle_id?: string | null;
          linked_circle_slug?: string | null;
          linked_discussion_title?: string | null;
          linked_thread_id?: string | null;
          linked_live_id?: string | null;
          media_thumb?: string | null;
          linked_url?: string | null;
          pics_urls?: string[] | null;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          is_pinned?: boolean;
          edited_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profile_updates']['Insert']>;
        Relationships: [];
      };

      profile_update_likes: {
        Row: {
          id: string;
          user_id: string;
          update_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          update_id: string;
        };
        Update: Partial<Database['public']['Tables']['profile_update_likes']['Insert']>;
        Relationships: [];
      };

      profile_update_comments: {
        Row: {
          id: string;
          update_id: string;
          author_id: string;
          parent_id: string | null;
          content: string;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          update_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          edited_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profile_update_comments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'profile_update_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };

      sound_context_votes: {
        Row: {
          id: string;
          source_post_id: string;
          voter_id: string;
          vote: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_post_id: string;
          voter_id: string;
          vote: number;
        };
        Update: Partial<Database['public']['Tables']['sound_context_votes']['Insert']>;
        Relationships: [];
      };

      streak_activity: {
        Row: {
          id: string;
          user_id: string;
          activity_date: string;
          activity_type: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_date?: string;
          activity_type?: string;
        };
        Update: Partial<Database['public']['Tables']['streak_activity']['Insert']>;
        Relationships: [];
      };

      stream_gifts: {
        Row: {
          id: string;
          stream_id: string;
          sender_id: string;
          gift_id: string;
          gift_name: string;
          gift_emoji: string;
          coin_cost: number;
          quantity: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          stream_id: string;
          sender_id: string;
          gift_id: string;
          gift_name: string;
          gift_emoji: string;
          coin_cost?: number;
          quantity?: number;
        };
        Update: Partial<Database['public']['Tables']['stream_gifts']['Insert']>;
        Relationships: [];
      };

      stream_messages: {
        Row: {
          id: string;
          stream_id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          role: string | null;
          content: string;
          message_type: string;
          is_host: boolean;
          is_moderator: boolean;
          is_subscriber: boolean;
          deleted_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          stream_id: string;
          user_id: string;
          display_name: string;
          avatar_url?: string | null;
          role?: string | null;
          content: string;
          message_type?: string;
          is_host?: boolean;
          is_moderator?: boolean;
          is_subscriber?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['stream_messages']['Insert']>;
        Relationships: [];
      };

      stream_pinned_messages: {
        Row: {
          id: string;
          stream_id: string;
          content: string;
          pinned_by: string;
          pinned_by_name: string;
          is_active: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          stream_id: string;
          content: string;
          pinned_by: string;
          pinned_by_name: string;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['stream_pinned_messages']['Insert']>;
        Relationships: [];
      };

      stream_polls: {
        Row: {
          id: string;
          stream_id: string;
          question: string;
          options: Json;
          total_votes: number;
          ends_at: string;
          is_active: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          stream_id: string;
          question: string;
          options?: Json;
          total_votes?: number;
          ends_at: string;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['stream_polls']['Insert']>;
        Relationships: [];
      };

      stream_poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          poll_id: string;
          option_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['stream_poll_votes']['Insert']>;
        Relationships: [];
      };

      user_bans: {
        Row: {
          id: string;
          user_id: string;
          banned_by: string;
          reason: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          banned_by: string;
          reason: string;
          expires_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_bans']['Insert']>;
        Relationships: [];
      };

      user_coins: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          total_purchased: number;
          total_spent: number;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          total_purchased?: number;
          total_spent?: number;
        };
        Update: Partial<Database['public']['Tables']['user_coins']['Insert']>;
        Relationships: [];
      };

      user_streaks: {
        Row: {
          user_id: string;
          /** Migration 012 */
          current_streak: number | null;
          best_streak: number | null;
          streak_started_at: string | null;
          /** Migration 058 (parallel columns) */
          current_streak_days: number | null;
          longest_streak_days: number | null;
          last_active_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_streak?: number | null;
          best_streak?: number | null;
          streak_started_at?: string | null;
          current_streak_days?: number | null;
          longest_streak_days?: number | null;
          last_active_date?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_streaks']['Insert']>;
        Relationships: [];
      };

      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: string;
          expires_at: string | null;
          revenuecat_customer_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier?: string;
          expires_at?: string | null;
          revenuecat_customer_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      credit_mock_purchase: {
        Args: { sku: string; coins: number };
        Returns: undefined;
      };
      get_top_events: {
        Args: { days_back?: number };
        Returns: { name: string; count: number }[];
      };
      get_for_you_post_ids: {
        Args: { viewer_uuid: string; result_limit?: number };
        Returns: { id: string }[];
      };
      get_ranked_feed_v2: {
        Args: { viewer_id: string; feed_limit: number };
        Returns: { post_id: string; score: number }[];
      };
      get_ranked_feed: {
        Args: { viewer_id: string; feed_limit?: number; cursor_ts?: string | null };
        Returns: { post_id: string; score: number }[];
      };
      get_top_today: {
        Args: { feed_limit?: number };
        Returns: { post_id: string; score: number }[];
      };
      get_mutual_follow_ids: {
        Args: { viewer: string };
        Returns: { creator_id: string }[];
      };
      get_current_pulse_score: {
        Args: { p_user_id?: string };
        Returns: {
          reach: number;
          resonance: number;
          rhythm: number;
          range_: number;
          reciprocity: number;
          overall: number;
          tier: string;
          month_start: string;
          streak_days: number;
        }[];
      };
      get_pulse_history: {
        Args: { p_user_id?: string };
        Returns: Record<string, Json>[];
      };
      get_top_current_pulse: {
        Args: { p_limit?: number; p_circle_id?: string | null };
        Returns: Record<string, Json>[];
      };
      get_top_lifetime_pulse: {
        Args: { p_limit?: number; p_circle_id?: string | null };
        Returns: Record<string, Json>[];
      };
      increment_ad_impression: {
        Args: { campaign_id: string };
        Returns: undefined;
      };
      get_community_card_stats: {
        Args: { p_ids: string[] };
        Returns: Record<string, Json>[];
      };
      increment_ad_click: {
        Args: { campaign_id: string };
        Returns: undefined;
      };
      increment_creator_earnings: {
        Args: { creator_id: string; tip_amount: number };
        Returns: undefined;
      };
      increment_poll_vote: {
        Args: { p_poll_id: string; p_option_id: string };
        Returns: undefined;
      };
      increment_comment_likes: {
        Args: { comment_id: string };
        Returns: undefined;
      };
      pin_profile_update: {
        Args: { p_update_id: string };
        Returns: undefined;
      };
      unpin_profile_update: {
        Args: { p_update_id: string };
        Returns: undefined;
      };
      toggle_profile_update_like: {
        Args: { p_update_id: string };
        Returns: boolean;
      };
      transfer_gift_coins: {
        Args: { sender_uid: string; stream_uid: string; amount: number };
        Returns: undefined;
      };
      update_user_streak: {
        Args: { p_user_id: string };
        Returns: {
          current_streak: number;
          best_streak: number;
        } | null;
      };
      search_sound_library: {
        Args: { p_query: string; p_limit?: number };
        Returns: Record<string, Json>[];
      };
      admin_upsert_sound_catalog: {
        Args: {
          p_post_id: string;
          p_artist?: string | null;
          p_keywords?: string | null;
          p_sort_boost?: number;
          p_is_active?: boolean;
        };
        Returns: string;
      };
      admin_delete_sound_catalog: {
        Args: { p_post_id: string };
        Returns: undefined;
      };
      get_viral_sounds_this_week: {
        Args: Record<string, never>;
        Returns: Record<string, Json>[];
      };
      search_hashtags: {
        Args: { p_term: string; p_limit?: number };
        Returns: Record<string, Json>[];
      };
    };
    Enums: {};
  };
}
