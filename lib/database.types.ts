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
          profile_song_title?: string | null;
          profile_song_artist?: string | null;
          profile_song_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      posts: {
        Row: {
          id: string;
          creator_id: string;
          type: string;
          caption: string;
          media_url: string | null;
          thumbnail_url: string | null;
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
          hashtags?: string[];
          communities?: string[];
          is_anonymous?: boolean;
          privacy_mode?: string;
          role_context?: string;
          specialty_context?: string;
          location_context?: string;
          sound_title?: string | null;
          sound_source_post_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['posts']['Insert']>;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          is_pinned?: boolean;
        };
        Update: Partial<Database['public']['Tables']['comments']['Insert']>;
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
          actor_id: string;
          message: string;
          target_id?: string | null;
          read?: boolean;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
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
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
