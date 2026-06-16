export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          advertiser_logo: string | null
          advertiser_name: string
          budget_spent: number
          budget_total: number
          clicks: number
          cpm_rate: number
          created_at: string | null
          cta_label: string
          cta_url: string
          description: string
          end_date: string
          id: string
          impressions: number
          media_url: string
          start_date: string
          status: string
          target_roles: string[] | null
          target_specialties: string[] | null
          target_states: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          advertiser_logo?: string | null
          advertiser_name: string
          budget_spent?: number
          budget_total?: number
          clicks?: number
          cpm_rate?: number
          created_at?: string | null
          cta_label?: string
          cta_url: string
          description?: string
          end_date: string
          id?: string
          impressions?: number
          media_url: string
          start_date?: string
          status?: string
          target_roles?: string[] | null
          target_specialties?: string[] | null
          target_states?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          advertiser_logo?: string | null
          advertiser_name?: string
          budget_spent?: number
          budget_total?: number
          clicks?: number
          cpm_rate?: number
          created_at?: string | null
          cta_label?: string
          cta_url?: string
          description?: string
          end_date?: string
          id?: string
          impressions?: number
          media_url?: string
          start_date?: string
          status?: string
          target_roles?: string[] | null
          target_specialties?: string[] | null
          target_states?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          staff_user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          staff_user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_saved_views: {
        Row: {
          created_at: string
          id: string
          params: Json
          route_path: string
          staff_user_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          params?: Json
          route_path: string
          staff_user_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          params?: Json
          route_path?: string
          staff_user_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_saved_views_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_event_schema_versions: {
        Row: {
          active: boolean
          created_at: string
          description: string
          spec: Json
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          spec?: Json
          version: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          spec?: Json
          version?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          screen: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          screen?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          screen?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_client_config: {
        Row: {
          id: number
          min_app_version: string
          updated_at: string
        }
        Insert: {
          id?: number
          min_app_version?: string
          updated_at?: string
        }
        Update: {
          id?: number
          min_app_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          color: string
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          color?: string
          description?: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          color?: string
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      border_collections: {
        Row: {
          collection_type: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_retired: boolean
          name: string
          release_at: string | null
          season_code: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          collection_type: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_retired?: boolean
          name: string
          release_at?: string | null
          season_code?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          collection_type?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_retired?: boolean
          name?: string
          release_at?: string | null
          season_code?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      border_gifts: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          note: string | null
          recipient_user_id: string
          sender_user_id: string
          shop_item_id: string
          status: string
          wallet_transaction_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          note?: string | null
          recipient_user_id: string
          sender_user_id: string
          shop_item_id: string
          status?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          note?: string | null
          recipient_user_id?: string
          sender_user_id?: string
          shop_item_id?: string
          status?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "border_gifts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "border_gifts_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "border_gifts_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "border_gifts_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      border_pricing_rules: {
        Row: {
          created_at: string
          default_price_band: string
          id: string
          notes: string | null
          rarity_tier: string
          recommended_display_label: string
          sort_order: number
          visual_tier: string
        }
        Insert: {
          created_at?: string
          default_price_band: string
          id?: string
          notes?: string | null
          rarity_tier: string
          recommended_display_label: string
          sort_order?: number
          visual_tier: string
        }
        Update: {
          created_at?: string
          default_price_band?: string
          id?: string
          notes?: string | null
          rarity_tier?: string
          recommended_display_label?: string
          sort_order?: number
          visual_tier?: string
        }
        Relationships: []
      }
      career_milestones: {
        Row: {
          description: string | null
          earned_at: string | null
          id: string
          milestone_type: string
          title: string
          user_id: string
        }
        Insert: {
          description?: string | null
          earned_at?: string | null
          id?: string
          milestone_type: string
          title: string
          user_id: string
        }
        Update: {
          description?: string | null
          earned_at?: string | null
          id?: string
          milestone_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      circle_moderators: {
        Row: {
          community_id: string
          created_at: string
          created_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_moderators_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_moderators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_notification_digests: {
        Row: {
          community_id: string
          created_at: string
          id: string
          is_confessions: boolean
          latest_activity_at: string
          latest_post_id: string | null
          notification_id: string | null
          post_count: number
          updated_at: string
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          is_confessions?: boolean
          latest_activity_at?: string
          latest_post_id?: string | null
          notification_id?: string | null
          post_count?: number
          updated_at?: string
          user_id: string
          window_end: string
          window_start: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          is_confessions?: boolean
          latest_activity_at?: string
          latest_post_id?: string | null
          notification_id?: string | null
          post_count?: number
          updated_at?: string
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_notification_digests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_notification_digests_latest_post_id_fkey"
            columns: ["latest_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_notification_digests_latest_post_id_fkey"
            columns: ["latest_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_notification_digests_latest_post_id_fkey"
            columns: ["latest_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_notification_digests_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_notification_digests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_post_notification_fanout: {
        Row: {
          actor_id: string | null
          batch_size: number
          batches_sent: number
          community_id: string
          created_at: string
          cursor_joined_at: string
          id: string
          message: string
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          batch_size?: number
          batches_sent?: number
          community_id: string
          created_at?: string
          cursor_joined_at: string
          id?: string
          message: string
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          batch_size?: number
          batches_sent?: number
          community_id?: string
          created_at?: string
          cursor_joined_at?: string
          id?: string
          message?: string
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_post_notification_fanout_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_post_notification_fanout_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_post_notification_fanout_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_post_notification_fanout_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_post_notification_fanout_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string
          reaction_count: number
          thread_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          reaction_count?: number
          thread_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          reaction_count?: number
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_replies_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads_viewer_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_thread_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_thread_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_thread_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_thread_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_threads: {
        Row: {
          author_id: string
          body: string
          community_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          kind: string
          linked_post_id: string | null
          media_thumb_url: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string
          reaction_count: number
          reply_count: number
          share_count: number
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          community_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind: string
          linked_post_id?: string | null
          media_thumb_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          reaction_count?: number
          reply_count?: number
          share_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          community_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind?: string
          linked_post_id?: string | null
          media_thumb_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          reaction_count?: number
          reply_count?: number
          share_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_gift_attributions: {
        Row: {
          clip_publisher_id: string
          clipped_post_id: string | null
          created_at: string
          creator_gift_id: string
          diamonds_earned_total: number
          id: string
          metadata: Json
          original_creator_diamonds_attributed: number
          original_creator_id: string | null
          original_creator_share_bps: number
          publisher_diamonds_attributed: number
          publisher_share_bps: number
          source_live_stream_id: string | null
          source_post_id: string | null
          sparks_spent: number
          split_status: string
        }
        Insert: {
          clip_publisher_id: string
          clipped_post_id?: string | null
          created_at?: string
          creator_gift_id: string
          diamonds_earned_total: number
          id?: string
          metadata?: Json
          original_creator_diamonds_attributed: number
          original_creator_id?: string | null
          original_creator_share_bps: number
          publisher_diamonds_attributed: number
          publisher_share_bps: number
          source_live_stream_id?: string | null
          source_post_id?: string | null
          sparks_spent: number
          split_status?: string
        }
        Update: {
          clip_publisher_id?: string
          clipped_post_id?: string | null
          created_at?: string
          creator_gift_id?: string
          diamonds_earned_total?: number
          id?: string
          metadata?: Json
          original_creator_diamonds_attributed?: number
          original_creator_id?: string | null
          original_creator_share_bps?: number
          publisher_diamonds_attributed?: number
          publisher_share_bps?: number
          source_live_stream_id?: string | null
          source_post_id?: string | null
          sparks_spent?: number
          split_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_gift_attributions_clip_publisher_id_fkey"
            columns: ["clip_publisher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_clipped_post_id_fkey"
            columns: ["clipped_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_clipped_post_id_fkey"
            columns: ["clipped_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_clipped_post_id_fkey"
            columns: ["clipped_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_creator_gift_id_fkey"
            columns: ["creator_gift_id"]
            isOneToOne: true
            referencedRelation: "creator_gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_original_creator_id_fkey"
            columns: ["original_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_source_live_stream_id_fkey"
            columns: ["source_live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_gift_attributions_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_projects: {
        Row: {
          created_at: string
          host_creator_id: string
          id: string
          published_post_id: string | null
          result_storage_path: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_creator_id: string
          id?: string
          published_post_id?: string | null
          result_storage_path?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_creator_id?: string
          id?: string
          published_post_id?: string | null
          result_storage_path?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_projects_host_creator_id_fkey"
            columns: ["host_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_projects_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_projects_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_projects_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_slots: {
        Row: {
          id: string
          invite_id: string | null
          invitee_user_id: string | null
          max_duration_sec: number
          project_id: string
          slot_index: number
          status: string
          submitted_storage_path: string | null
        }
        Insert: {
          id?: string
          invite_id?: string | null
          invitee_user_id?: string | null
          max_duration_sec?: number
          project_id: string
          slot_index: number
          status?: string
          submitted_storage_path?: string | null
        }
        Update: {
          id?: string
          invite_id?: string | null
          invitee_user_id?: string | null
          max_duration_sec?: number
          project_id?: string
          slot_index?: number
          status?: string
          submitted_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collab_slots_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "post_collab_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_slots_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_slots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collab_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          like_count: number
          media_url: string | null
          parent_id: string | null
          post_id: string
          reaction_angry_count: number
          reaction_clap_count: number
          reaction_haha_count: number
          reaction_heart_count: number
          reaction_sad_count: number
          reaction_wow_count: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          media_url?: string | null
          parent_id?: string | null
          post_id: string
          reaction_angry_count?: number
          reaction_clap_count?: number
          reaction_haha_count?: number
          reaction_heart_count?: number
          reaction_sad_count?: number
          reaction_wow_count?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          media_url?: string | null
          parent_id?: string | null
          post_id?: string
          reaction_angry_count?: number
          reaction_clap_count?: number
          reaction_haha_count?: number
          reaction_heart_count?: number
          reaction_sad_count?: number
          reaction_wow_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          accent_color: string
          banner_url: string | null
          categories: string[]
          created_at: string
          description: string
          featured_order: number | null
          icon: string
          id: string
          member_count: number
          name: string
          post_count: number
          profile_open_count: number
          slug: string
          trending_topics: string[]
        }
        Insert: {
          accent_color?: string
          banner_url?: string | null
          categories?: string[]
          created_at?: string
          description?: string
          featured_order?: number | null
          icon?: string
          id?: string
          member_count?: number
          name: string
          post_count?: number
          profile_open_count?: number
          slug: string
          trending_topics?: string[]
        }
        Update: {
          accent_color?: string
          banner_url?: string | null
          categories?: string[]
          created_at?: string
          description?: string
          featured_order?: number | null
          icon?: string
          id?: string
          member_count?: number
          name?: string
          post_count?: number
          profile_open_count?: number
          slug?: string
          trending_topics?: string[]
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          is_moderator: boolean
          joined_at: string
          notify_new_posts: boolean
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          is_moderator?: boolean
          joined_at?: string
          notify_new_posts?: boolean
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          is_moderator?: boolean
          joined_at?: string
          notify_new_posts?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_pins: {
        Row: {
          community_id: string
          created_at: string
          id: string
          post_id: string
          sort_order: number
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          post_id: string
          sort_order?: number
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          post_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_post_pins_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_pins_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_pins_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_pins_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_tasks: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          id: string
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_appeals: {
        Row: {
          created_at: string
          id: string
          message: string
          post_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          post_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          post_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_appeals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_appeals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_appeals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          creator_id: string
          id: string
          last_payout_at: string | null
          lifetime_earnings: number
          monthly_earnings: number
          pending_payout: number
          total_likes: number
          total_tips: number
          total_views: number
          updated_at: string | null
        }
        Insert: {
          creator_id: string
          id?: string
          last_payout_at?: string | null
          lifetime_earnings?: number
          monthly_earnings?: number
          pending_payout?: number
          total_likes?: number
          total_tips?: number
          total_views?: number
          updated_at?: string | null
        }
        Update: {
          creator_id?: string
          id?: string
          last_payout_at?: string | null
          lifetime_earnings?: number
          monthly_earnings?: number
          pending_payout?: number
          total_likes?: number
          total_tips?: number
          total_views?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      creator_gifts: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          creator_user_id: string
          creator_wallet_txn_id: string | null
          diamonds_earned: number
          gift_item_id: string
          id: string
          idempotency_key: string | null
          metadata: Json
          sender_user_id: string
          sender_wallet_txn_id: string | null
          sparks_spent: number
          status: string
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string
          creator_user_id: string
          creator_wallet_txn_id?: string | null
          diamonds_earned: number
          gift_item_id: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          sender_user_id: string
          sender_wallet_txn_id?: string | null
          sparks_spent: number
          status?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          creator_user_id?: string
          creator_wallet_txn_id?: string | null
          diamonds_earned?: number
          gift_item_id?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          sender_user_id?: string
          sender_wallet_txn_id?: string | null
          sparks_spent?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_gifts_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_gifts_creator_wallet_txn_id_fkey"
            columns: ["creator_wallet_txn_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_gifts_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_gifts_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_gifts_sender_wallet_txn_id_fkey"
            columns: ["sender_wallet_txn_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_media_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          encode_complete: boolean
          error: string | null
          id: string
          idempotency_key: string | null
          input: Json
          kind: string
          last_error_code: string | null
          max_attempts: number
          next_retry_at: string | null
          output: Json | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          encode_complete?: boolean
          error?: string | null
          id?: string
          idempotency_key?: string | null
          input?: Json
          kind: string
          last_error_code?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          output?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          encode_complete?: boolean
          error?: string | null
          id?: string
          idempotency_key?: string | null
          input?: Json
          kind?: string
          last_error_code?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          output?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_media_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_post_subscribers: {
        Row: {
          created_at: string
          creator_id: string
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          subscriber_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_post_subscribers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_post_subscribers_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tips: {
        Row: {
          amount: number
          created_at: string | null
          from_user_id: string
          id: string
          ledger_applied: boolean
          message: string | null
          post_id: string | null
          to_creator_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          from_user_id: string
          id?: string
          ledger_applied?: boolean
          message?: string | null
          post_id?: string | null
          to_creator_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          from_user_id?: string
          id?: string
          ledger_applied?: boolean
          message?: string | null
          post_id?: string | null
          to_creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      diamond_wallets: {
        Row: {
          creator_id: string
          diamonds_available: number
          diamonds_paid_out: number
          diamonds_pending: number
          total_diamonds_earned: number
          updated_at: string
        }
        Insert: {
          creator_id: string
          diamonds_available?: number
          diamonds_paid_out?: number
          diamonds_pending?: number
          total_diamonds_earned?: number
          updated_at?: string
        }
        Update: {
          creator_id?: string
          diamonds_available?: number
          diamonds_paid_out?: number
          diamonds_pending?: number
          total_diamonds_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diamond_wallets_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          event_type: string
          id: number
          occurred_at: string
          payload: Json
          target_id: string | null
          target_kind: string | null
          user_id: string
        }
        Insert: {
          event_type: string
          id?: number
          occurred_at?: string
          payload?: Json
          target_id?: string | null
          target_kind?: string | null
          user_id: string
        }
        Update: {
          event_type?: string
          id?: number
          occurred_at?: string
          payload?: Json
          target_id?: string | null
          target_kind?: string | null
          user_id?: string
        }
        Relationships: []
      }
      experiment_assignments: {
        Row: {
          assigned_at: string
          experiment_slug: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string
          experiment_slug: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string
          experiment_slug?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_assignments_experiment_slug_fkey"
            columns: ["experiment_slug"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "experiment_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          variants: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          variants?: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          variants?: Json
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          rules: Json
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          rules?: Json
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      feed_user_actions: {
        Row: {
          action: string
          created_at: string
          creator_id: string | null
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          creator_id?: string | null
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_user_actions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_user_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_user_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_user_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_user_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_review_queue: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          score: number | null
          status: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          score?: number | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          score?: number | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: []
      }
      host_earnings: {
        Row: {
          coins: number
          created_at: string
          gift_id: string | null
          gift_name: string | null
          host_id: string
          id: string
          sender_id: string | null
          source: string
          stream_id: string
        }
        Insert: {
          coins: number
          created_at?: string
          gift_id?: string | null
          gift_name?: string | null
          host_id: string
          id?: string
          sender_id?: string | null
          source?: string
          stream_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          gift_id?: string | null
          gift_name?: string | null
          host_id?: string
          id?: string
          sender_id?: string | null
          source?: string
          stream_id?: string
        }
        Relationships: []
      }
      host_earnings_totals: {
        Row: {
          host_id: string
          last_gift_at: string | null
          total_coins: number
          total_gifts: number
          updated_at: string
        }
        Insert: {
          host_id: string
          last_gift_at?: string | null
          total_coins?: number
          total_gifts?: number
          updated_at?: string
        }
        Update: {
          host_id?: string
          last_gift_at?: string | null
          total_coins?: number
          total_gifts?: number
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          job_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          job_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          created_at: string | null
          employer_id: string
          expires_at: string
          id: string
          job_id: string
          paid_amount: number
          status: string
          tier: string
        }
        Insert: {
          created_at?: string | null
          employer_id: string
          expires_at: string
          id?: string
          job_id: string
          paid_amount?: number
          status?: string
          tier?: string
        }
        Update: {
          created_at?: string | null
          employer_id?: string
          expires_at?: string
          id?: string
          job_id?: string
          paid_amount?: number
          status?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits: string[]
          city: string
          created_at: string
          description: string
          employer_logo: string | null
          employer_name: string
          employment_type: string
          id: string
          is_featured: boolean
          is_new: boolean
          pay_max: number
          pay_min: number
          requirements: string[]
          role: string
          shift: string
          specialty: string
          state: string
          title: string
        }
        Insert: {
          benefits?: string[]
          city?: string
          created_at?: string
          description?: string
          employer_logo?: string | null
          employer_name: string
          employment_type?: string
          id?: string
          is_featured?: boolean
          is_new?: boolean
          pay_max?: number
          pay_min?: number
          requirements?: string[]
          role?: string
          shift?: string
          specialty?: string
          state?: string
          title: string
        }
        Update: {
          benefits?: string[]
          city?: string
          created_at?: string
          description?: string
          employer_logo?: string | null
          employer_name?: string
          employment_type?: string
          id?: string
          is_featured?: boolean
          is_new?: boolean
          pay_max?: number
          pay_min?: number
          requirements?: string[]
          role?: string
          shift?: string
          specialty?: string
          state?: string
          title?: string
        }
        Relationships: []
      }
      live_clip_markers: {
        Row: {
          clip_duration_seconds: number | null
          created_at: string
          created_by: string
          end_seconds: number
          host_id: string
          id: string
          marker_time_seconds: number
          recording_id: string | null
          start_seconds: number
          status: string
          stream_id: string
          title: string
        }
        Insert: {
          clip_duration_seconds?: number | null
          created_at?: string
          created_by: string
          end_seconds: number
          host_id: string
          id?: string
          marker_time_seconds: number
          recording_id?: string | null
          start_seconds: number
          status?: string
          stream_id: string
          title?: string
        }
        Update: {
          clip_duration_seconds?: number | null
          created_at?: string
          created_by?: string
          end_seconds?: number
          host_id?: string
          id?: string
          marker_time_seconds?: number
          recording_id?: string | null
          start_seconds?: number
          status?: string
          stream_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_clip_markers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clip_markers_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clip_markers_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "live_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clip_markers_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_clips: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          end_seconds: number
          error_message: string | null
          feed_post_id: string | null
          hashtags: string[]
          host_id: string
          id: string
          marker_id: string | null
          processing_job_id: string | null
          publish_status: string
          published_at: string | null
          recording_id: string
          start_seconds: number
          status: string
          storage_path: string | null
          stream_id: string
          thumbnail_path: string | null
          title: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          end_seconds: number
          error_message?: string | null
          feed_post_id?: string | null
          hashtags?: string[]
          host_id: string
          id?: string
          marker_id?: string | null
          processing_job_id?: string | null
          publish_status?: string
          published_at?: string | null
          recording_id: string
          start_seconds: number
          status?: string
          storage_path?: string | null
          stream_id: string
          thumbnail_path?: string | null
          title?: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          end_seconds?: number
          error_message?: string | null
          feed_post_id?: string | null
          hashtags?: string[]
          host_id?: string
          id?: string
          marker_id?: string | null
          processing_job_id?: string | null
          publish_status?: string
          published_at?: string | null
          recording_id?: string
          start_seconds?: number
          status?: string
          storage_path?: string | null
          stream_id?: string
          thumbnail_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_clips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "live_clip_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_processing_job_id_fkey"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "creator_media_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "live_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_clips_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          egress_id: string | null
          ended_at: string | null
          error_message: string | null
          host_id: string
          id: string
          room_name: string
          started_at: string | null
          status: string
          storage_path: string | null
          stream_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          egress_id?: string | null
          ended_at?: string | null
          error_message?: string | null
          host_id: string
          id?: string
          room_name: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          stream_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          egress_id?: string | null
          ended_at?: string | null
          error_message?: string | null
          host_id?: string
          id?: string
          room_name?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_recordings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_recordings_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_attendance: {
        Row: {
          last_seen_at: string
          stream_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          stream_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_attendance_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_gift_catalog: {
        Row: {
          display_name: string
          emoji: string
          gift_id: string
          is_active: boolean
          sort_order: number
          spark_unit_cost: number
          updated_at: string
        }
        Insert: {
          display_name: string
          emoji?: string
          gift_id: string
          is_active?: boolean
          sort_order?: number
          spark_unit_cost: number
          updated_at?: string
        }
        Update: {
          display_name?: string
          emoji?: string
          gift_id?: string
          is_active?: boolean
          sort_order?: number
          spark_unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      live_stream_reminders: {
        Row: {
          created_at: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_reminders_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          allow_clip_downloads: boolean
          broadcast_started_at: string | null
          category: string
          community_id: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          host_id: string
          host_last_seen_at: string | null
          id: string
          livekit_room_name: string | null
          peak_viewer_count: number | null
          recording_enabled: boolean
          require_host_approval: boolean
          scene_mode: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          video_provider: string
          viewer_clips_allowed: boolean
          viewer_count: number | null
        }
        Insert: {
          allow_clip_downloads?: boolean
          broadcast_started_at?: string | null
          category?: string
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id: string
          host_last_seen_at?: string | null
          id?: string
          livekit_room_name?: string | null
          peak_viewer_count?: number | null
          recording_enabled?: boolean
          require_host_approval?: boolean
          scene_mode?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          video_provider?: string
          viewer_clips_allowed?: boolean
          viewer_count?: number | null
        }
        Update: {
          allow_clip_downloads?: boolean
          broadcast_started_at?: string | null
          category?: string
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string
          host_last_seen_at?: string | null
          id?: string
          livekit_room_name?: string | null
          peak_viewer_count?: number | null
          recording_enabled?: boolean
          require_host_approval?: boolean
          scene_mode?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          video_provider?: string
          viewer_clips_allowed?: boolean
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_contact_messages: {
        Row: {
          created_at: string
          email: string
          host: string | null
          id: string
          internal_notes: string | null
          last_contacted_at: string | null
          message: string
          name: string
          owner_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          host?: string | null
          id?: string
          internal_notes?: string | null
          last_contacted_at?: string | null
          message: string
          name: string
          owner_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          host?: string | null
          id?: string
          internal_notes?: string | null
          last_contacted_at?: string | null
          message?: string
          name?: string
          owner_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contact_messages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_newsletter_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      mentions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          mentioned_user_id: string
          mentioner_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          mentioner_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          mentioner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioner_id_fkey"
            columns: ["mentioner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_reactions: {
        Row: {
          caption: string
          created_at: string
          id: string
          media_url: string
          mentor_id: string
          parent_post_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          media_url: string
          mentor_id: string
          parent_post_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          media_url?: string
          mentor_id?: string
          parent_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_reactions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reactions_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reactions_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reactions_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          community_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          target_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          community_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          target_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          community_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          target_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "partner_api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number | null
          created_at: string | null
          creator_id: string
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          creator_id: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          creator_id?: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      placement_trust_scores: {
        Row: {
          breakdown: Json
          computed_at: string
          id: string
          scope_id: string | null
          scope_type: string
          score: number
        }
        Insert: {
          breakdown?: Json
          computed_at?: string
          id?: string
          scope_id?: string | null
          scope_type: string
          score: number
        }
        Update: {
          breakdown?: Json
          computed_at?: string
          id?: string
          scope_id?: string | null
          scope_type?: string
          score?: number
        }
        Relationships: []
      }
      post_collab_invites: {
        Row: {
          collab_project_id: string | null
          created_at: string
          host_creator_id: string
          id: string
          invitee_user_id: string | null
          note: string | null
          slot_index: number | null
          status: string
          updated_at: string
        }
        Insert: {
          collab_project_id?: string | null
          created_at?: string
          host_creator_id: string
          id?: string
          invitee_user_id?: string | null
          note?: string | null
          slot_index?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          collab_project_id?: string | null
          created_at?: string
          host_creator_id?: string
          id?: string
          invitee_user_id?: string | null
          note?: string | null
          slot_index?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_collab_invites_collab_project_id_fkey"
            columns: ["collab_project_id"]
            isOneToOne: false
            referencedRelation: "collab_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_collab_invites_host_creator_id_fkey"
            columns: ["host_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_collab_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_cover_ab_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          post_id: string
          session_id: string | null
          variant: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          post_id: string
          session_id?: string | null
          variant: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          post_id?: string
          session_id?: string | null
          variant?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_cover_ab_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cover_ab_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cover_ab_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_cover_ab_events_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          view_duration_ms: number | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          view_duration_ms?: number | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          view_duration_ms?: number | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          additional_media: string[] | null
          allow_clip_downloads: boolean
          allow_remix: boolean
          allow_viewer_clips: boolean
          caption: string
          clip_end_seconds: number | null
          clip_start_seconds: number | null
          comment_count: number
          comments_disabled: boolean
          communities: string[]
          cover_alt_url: string | null
          created_at: string
          creator_id: string
          duet_layout_mode: string | null
          duet_parent_id: string | null
          edited_at: string | null
          education_citations: Json | null
          evidence_label: string | null
          evidence_url: string | null
          feed_type_eligible: string[]
          hashtags: string[]
          id: string
          is_anonymous: boolean
          is_education: boolean
          like_count: number
          location_context: string
          media_processing_error: string | null
          media_processing_job_id: string | null
          media_processing_status: string | null
          media_url: string | null
          mood_preset: string | null
          privacy_mode: string
          ranking_score: number
          reaction_angry_count: number
          reaction_clap_count: number
          reaction_haha_count: number
          reaction_heart_count: number
          reaction_sad_count: number
          reaction_wow_count: number
          role_context: string
          save_count: number
          scheduled_at: string | null
          scheduled_status: string
          series_id: string | null
          series_part: number | null
          series_total: number | null
          share_count: number
          shift_context: string | null
          sound_source_media_url: string | null
          sound_source_post_id: string | null
          sound_title: string | null
          source_creator_id: string | null
          source_live_stream_id: string | null
          source_post_id: string | null
          specialty_context: string
          stitch_source_post_id: string | null
          thumbnail_url: string | null
          type: string
          video_look_id: string | null
          video_overlay_text: string | null
          video_overlay_style: Json | null
          view_count: number
        }
        Insert: {
          additional_media?: string[] | null
          allow_clip_downloads?: boolean
          allow_remix?: boolean
          allow_viewer_clips?: boolean
          caption?: string
          clip_end_seconds?: number | null
          clip_start_seconds?: number | null
          comment_count?: number
          comments_disabled?: boolean
          communities?: string[]
          cover_alt_url?: string | null
          created_at?: string
          creator_id: string
          duet_layout_mode?: string | null
          duet_parent_id?: string | null
          edited_at?: string | null
          education_citations?: Json | null
          evidence_label?: string | null
          evidence_url?: string | null
          feed_type_eligible?: string[]
          hashtags?: string[]
          id?: string
          is_anonymous?: boolean
          is_education?: boolean
          like_count?: number
          location_context?: string
          media_processing_error?: string | null
          media_processing_job_id?: string | null
          media_processing_status?: string | null
          media_url?: string | null
          mood_preset?: string | null
          privacy_mode?: string
          ranking_score?: number
          reaction_angry_count?: number
          reaction_clap_count?: number
          reaction_haha_count?: number
          reaction_heart_count?: number
          reaction_sad_count?: number
          reaction_wow_count?: number
          role_context?: string
          save_count?: number
          scheduled_at?: string | null
          scheduled_status?: string
          series_id?: string | null
          series_part?: number | null
          series_total?: number | null
          share_count?: number
          shift_context?: string | null
          sound_source_media_url?: string | null
          sound_source_post_id?: string | null
          sound_title?: string | null
          source_creator_id?: string | null
          source_live_stream_id?: string | null
          source_post_id?: string | null
          specialty_context?: string
          stitch_source_post_id?: string | null
          thumbnail_url?: string | null
          type?: string
          video_look_id?: string | null
          video_overlay_text?: string | null
          video_overlay_style?: Json | null
          view_count?: number
        }
        Update: {
          additional_media?: string[] | null
          allow_clip_downloads?: boolean
          allow_remix?: boolean
          allow_viewer_clips?: boolean
          caption?: string
          clip_end_seconds?: number | null
          clip_start_seconds?: number | null
          comment_count?: number
          comments_disabled?: boolean
          communities?: string[]
          cover_alt_url?: string | null
          created_at?: string
          creator_id?: string
          duet_layout_mode?: string | null
          duet_parent_id?: string | null
          edited_at?: string | null
          education_citations?: Json | null
          evidence_label?: string | null
          evidence_url?: string | null
          feed_type_eligible?: string[]
          hashtags?: string[]
          id?: string
          is_anonymous?: boolean
          is_education?: boolean
          like_count?: number
          location_context?: string
          media_processing_error?: string | null
          media_processing_job_id?: string | null
          media_processing_status?: string | null
          media_url?: string | null
          mood_preset?: string | null
          privacy_mode?: string
          ranking_score?: number
          reaction_angry_count?: number
          reaction_clap_count?: number
          reaction_haha_count?: number
          reaction_heart_count?: number
          reaction_sad_count?: number
          reaction_wow_count?: number
          role_context?: string
          save_count?: number
          scheduled_at?: string | null
          scheduled_status?: string
          series_id?: string | null
          series_part?: number | null
          series_total?: number | null
          share_count?: number
          shift_context?: string | null
          sound_source_media_url?: string | null
          sound_source_post_id?: string | null
          sound_title?: string | null
          source_creator_id?: string | null
          source_live_stream_id?: string | null
          source_post_id?: string | null
          specialty_context?: string
          stitch_source_post_id?: string | null
          thumbnail_url?: string | null
          type?: string
          video_look_id?: string | null
          video_overlay_text?: string | null
          video_overlay_style?: Json | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_duet_parent_id_fkey"
            columns: ["duet_parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_duet_parent_id_fkey"
            columns: ["duet_parent_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_duet_parent_id_fkey"
            columns: ["duet_parent_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_media_processing_job_id_fkey"
            columns: ["media_processing_job_id"]
            isOneToOne: false
            referencedRelation: "creator_media_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_sound_source_post_id_fkey"
            columns: ["sound_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_sound_source_post_id_fkey"
            columns: ["sound_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_sound_source_post_id_fkey"
            columns: ["sound_source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_creator_id_fkey"
            columns: ["source_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_live_stream_id_fkey"
            columns: ["source_live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_stitch_source_post_id_fkey"
            columns: ["stitch_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_stitch_source_post_id_fkey"
            columns: ["stitch_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_stitch_source_post_id_fkey"
            columns: ["stitch_source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_update_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          media_url: string | null
          parent_id: string | null
          update_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          media_url?: string | null
          parent_id?: string | null
          update_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          media_url?: string | null
          parent_id?: string | null
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_update_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_update_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profile_update_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_update_comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "profile_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_update_likes: {
        Row: {
          created_at: string
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_update_likes_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "profile_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_update_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_updates: {
        Row: {
          comment_count: number
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean
          like_count: number
          linked_circle_id: string | null
          linked_circle_slug: string | null
          linked_discussion_title: string | null
          linked_live_id: string | null
          linked_post_id: string | null
          linked_thread_id: string | null
          linked_url: string | null
          media_thumb: string | null
          mood: string | null
          pics_urls: string[] | null
          preview_text: string | null
          share_count: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_count?: number
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          linked_circle_id?: string | null
          linked_circle_slug?: string | null
          linked_discussion_title?: string | null
          linked_live_id?: string | null
          linked_post_id?: string | null
          linked_thread_id?: string | null
          linked_url?: string | null
          media_thumb?: string | null
          mood?: string | null
          pics_urls?: string[] | null
          preview_text?: string | null
          share_count?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_count?: number
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          linked_circle_id?: string | null
          linked_circle_slug?: string | null
          linked_discussion_title?: string | null
          linked_live_id?: string | null
          linked_post_id?: string | null
          linked_thread_id?: string | null
          linked_url?: string | null
          media_thumb?: string | null
          mood?: string | null
          pics_urls?: string[] | null
          preview_text?: string | null
          share_count?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_updates_linked_circle_id_fkey"
            columns: ["linked_circle_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_updates_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_updates_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_updates_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_updates_linked_thread_id_fkey"
            columns: ["linked_thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_updates_linked_thread_id_fkey"
            columns: ["linked_thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string
          brand_kit: Json
          city: string
          created_at: string
          default_allow_clip_downloads: boolean
          default_allow_remix: boolean
          default_allow_viewer_clips: boolean
          display_name: string
          first_name: string
          follower_count: number
          following_count: number
          hide_pulse_music_player_on_my_page: boolean
          id: string
          identity_tags: string[]
          is_creator: boolean
          is_verified: boolean
          last_name: string | null
          like_count: number
          post_count: number
          preferred_locale: string
          privacy_mode: string
          product_digest_email: boolean
          profile_song_artist: string | null
          profile_song_artwork_url: string | null
          profile_song_title: string | null
          profile_song_url: string | null
          pulse_score_current: number
          pulse_status_emoji: string | null
          pulse_status_text: string | null
          pulse_status_updated_at: string | null
          pulse_tier: string
          push_token: string | null
          push_token_updated_at: string | null
          role: string
          role_admin: boolean
          selected_pulse_avatar_frame_id: string | null
          shift_preference: string
          specialty: string
          state: string
          terms_and_privacy_accepted_at: string | null
          total_shares: number
          updated_at: string
          username: string | null
          years_experience: number
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          brand_kit?: Json
          city?: string
          created_at?: string
          default_allow_clip_downloads?: boolean
          default_allow_remix?: boolean
          default_allow_viewer_clips?: boolean
          display_name: string
          first_name: string
          follower_count?: number
          following_count?: number
          hide_pulse_music_player_on_my_page?: boolean
          id: string
          identity_tags?: string[]
          is_creator?: boolean
          is_verified?: boolean
          last_name?: string | null
          like_count?: number
          post_count?: number
          preferred_locale?: string
          privacy_mode?: string
          product_digest_email?: boolean
          profile_song_artist?: string | null
          profile_song_artwork_url?: string | null
          profile_song_title?: string | null
          profile_song_url?: string | null
          pulse_score_current?: number
          pulse_status_emoji?: string | null
          pulse_status_text?: string | null
          pulse_status_updated_at?: string | null
          pulse_tier?: string
          push_token?: string | null
          push_token_updated_at?: string | null
          role?: string
          role_admin?: boolean
          selected_pulse_avatar_frame_id?: string | null
          shift_preference?: string
          specialty?: string
          state?: string
          terms_and_privacy_accepted_at?: string | null
          total_shares?: number
          updated_at?: string
          username?: string | null
          years_experience?: number
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          brand_kit?: Json
          city?: string
          created_at?: string
          default_allow_clip_downloads?: boolean
          default_allow_remix?: boolean
          default_allow_viewer_clips?: boolean
          display_name?: string
          first_name?: string
          follower_count?: number
          following_count?: number
          hide_pulse_music_player_on_my_page?: boolean
          id?: string
          identity_tags?: string[]
          is_creator?: boolean
          is_verified?: boolean
          last_name?: string | null
          like_count?: number
          post_count?: number
          preferred_locale?: string
          privacy_mode?: string
          product_digest_email?: boolean
          profile_song_artist?: string | null
          profile_song_artwork_url?: string | null
          profile_song_title?: string | null
          profile_song_url?: string | null
          pulse_score_current?: number
          pulse_status_emoji?: string | null
          pulse_status_text?: string | null
          pulse_status_updated_at?: string | null
          pulse_tier?: string
          push_token?: string | null
          push_token_updated_at?: string | null
          role?: string
          role_admin?: boolean
          selected_pulse_avatar_frame_id?: string | null
          shift_preference?: string
          specialty?: string
          state?: string
          terms_and_privacy_accepted_at?: string | null
          total_shares?: number
          updated_at?: string
          username?: string | null
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_pulse_avatar_frame_id_fkey"
            columns: ["selected_pulse_avatar_frame_id"]
            isOneToOne: false
            referencedRelation: "pulse_avatar_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_avatar_frames: {
        Row: {
          acquisition_tag: string | null
          created_at: string
          glow_color: string
          id: string
          label: string
          month_start: string
          prize_tier: string
          rarity_tier: string
          ring_caption: string | null
          ring_color: string
          slug: string
          sort_order: number
          subtitle: string | null
        }
        Insert: {
          acquisition_tag?: string | null
          created_at?: string
          glow_color: string
          id?: string
          label: string
          month_start: string
          prize_tier: string
          rarity_tier?: string
          ring_caption?: string | null
          ring_color: string
          slug: string
          sort_order?: number
          subtitle?: string | null
        }
        Update: {
          acquisition_tag?: string | null
          created_at?: string
          glow_color?: string
          id?: string
          label?: string
          month_start?: string
          prize_tier?: string
          rarity_tier?: string
          ring_caption?: string | null
          ring_color?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
        }
        Relationships: []
      }
      purchase_receipts: {
        Row: {
          created_at: string
          external_transaction_id: string
          id: string
          platform: string
          processed_at: string | null
          receipt_payload: Json
          shop_item_id: string | null
          store_product_id: string
          user_id: string
          validation_status: string
        }
        Insert: {
          created_at?: string
          external_transaction_id: string
          id?: string
          platform: string
          processed_at?: string | null
          receipt_payload?: Json
          shop_item_id?: string | null
          store_product_id: string
          user_id: string
          validation_status?: string
        }
        Update: {
          created_at?: string
          external_transaction_id?: string
          id?: string
          platform?: string
          processed_at?: string | null
          receipt_payload?: Json
          shop_item_id?: string | null
          store_product_id?: string
          user_id?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          staff_notes: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_notes?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_notes?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_deliveries: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          delivery_type: string
          id: string
          idempotency_key: string
          item_id: string | null
          item_type: string
          metadata: Json
          opened_at: string | null
          quantity: number | null
          source_display_name: string | null
          source_user_id: string | null
          status: string
          toast_shown_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          delivery_type: string
          id?: string
          idempotency_key: string
          item_id?: string | null
          item_type: string
          metadata?: Json
          opened_at?: string | null
          quantity?: number | null
          source_display_name?: string | null
          source_user_id?: string | null
          status?: string
          toast_shown_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          delivery_type?: string
          id?: string
          idempotency_key?: string
          item_id?: string | null
          item_type?: string
          metadata?: Json
          opened_at?: string | null
          quantity?: number | null
          source_display_name?: string | null
          source_user_id?: string | null
          status?: string
          toast_shown_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          id: string
          job_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          job_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          job_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          id: string
          post_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          post_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          post_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_sounds: {
        Row: {
          created_at: string
          id: string
          source_post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_sounds_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_sounds_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_sounds_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_export_jobs: {
        Row: {
          config: Json
          created_at: string
          cron_expr: string | null
          enabled: boolean
          export_kind: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          cron_expr?: string | null
          enabled?: boolean
          export_kind: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          cron_expr?: string | null
          enabled?: boolean
          export_kind?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
        }
        Relationships: []
      }
      shift_status: {
        Row: {
          department: string | null
          facility: string | null
          is_active: boolean | null
          shift_type: string | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          department?: string | null
          facility?: string | null
          is_active?: boolean | null
          shift_type?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          department?: string | null
          facility?: string | null
          is_active?: boolean | null
          shift_type?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shop_admin_item_grants: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          note: string | null
          recipient_user_id: string
          shop_item_id: string
          wallet_transaction_id: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          recipient_user_id: string
          shop_item_id: string
          wallet_transaction_id?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          recipient_user_id?: string
          shop_item_id?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_admin_item_grants_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_admin_item_grants_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_admin_item_grants_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_admin_item_grants_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          animation_url: string | null
          availability_status: string | null
          category: string | null
          collection_id: string | null
          created_at: string
          description: string
          expires_at: string | null
          gift_contexts: string[] | null
          id: string
          image_url: string | null
          inventory_count: number | null
          is_active: boolean
          is_animated: boolean
          is_earned_only: boolean
          is_giftable: boolean
          is_limited: boolean
          is_retired: boolean
          is_shop_item: boolean
          is_tradable: boolean
          metadata: Json
          name: string
          prestige_score: number
          price_type: string | null
          rank_place: number | null
          rarity: string | null
          rarity_tier: string | null
          real_money_display_price: string | null
          release_at: string | null
          season_code: string | null
          slug: string
          sort_order: number
          source_type: string | null
          spark_amount: number | null
          spark_price: number | null
          store_product_id_android: string | null
          store_product_id_ios: string | null
          type: string
          unlock_method: string | null
          updated_at: string
          visual_tier: string | null
        }
        Insert: {
          animation_url?: string | null
          availability_status?: string | null
          category?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string
          expires_at?: string | null
          gift_contexts?: string[] | null
          id?: string
          image_url?: string | null
          inventory_count?: number | null
          is_active?: boolean
          is_animated?: boolean
          is_earned_only?: boolean
          is_giftable?: boolean
          is_limited?: boolean
          is_retired?: boolean
          is_shop_item?: boolean
          is_tradable?: boolean
          metadata?: Json
          name: string
          prestige_score?: number
          price_type?: string | null
          rank_place?: number | null
          rarity?: string | null
          rarity_tier?: string | null
          real_money_display_price?: string | null
          release_at?: string | null
          season_code?: string | null
          slug: string
          sort_order?: number
          source_type?: string | null
          spark_amount?: number | null
          spark_price?: number | null
          store_product_id_android?: string | null
          store_product_id_ios?: string | null
          type: string
          unlock_method?: string | null
          updated_at?: string
          visual_tier?: string | null
        }
        Update: {
          animation_url?: string | null
          availability_status?: string | null
          category?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string
          expires_at?: string | null
          gift_contexts?: string[] | null
          id?: string
          image_url?: string | null
          inventory_count?: number | null
          is_active?: boolean
          is_animated?: boolean
          is_earned_only?: boolean
          is_giftable?: boolean
          is_limited?: boolean
          is_retired?: boolean
          is_shop_item?: boolean
          is_tradable?: boolean
          metadata?: Json
          name?: string
          prestige_score?: number
          price_type?: string | null
          rank_place?: number | null
          rarity?: string | null
          rarity_tier?: string | null
          real_money_display_price?: string | null
          release_at?: string | null
          season_code?: string | null
          slug?: string
          sort_order?: number
          source_type?: string | null
          spark_amount?: number | null
          spark_price?: number | null
          store_product_id_android?: string | null
          store_product_id_ios?: string | null
          type?: string
          unlock_method?: string | null
          updated_at?: string
          visual_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "border_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          created_at: string | null
          endorsee_id: string
          endorser_id: string
          id: string
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          endorsee_id: string
          endorser_id: string
          id?: string
          skill_name: string
        }
        Update: {
          created_at?: string | null
          endorsee_id?: string
          endorser_id?: string
          id?: string
          skill_name?: string
        }
        Relationships: []
      }
      sound_catalog: {
        Row: {
          artist: string | null
          created_at: string
          id: string
          is_active: boolean
          keywords: string | null
          post_id: string
          sort_boost: number
        }
        Insert: {
          artist?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          post_id: string
          sort_boost?: number
        }
        Update: {
          artist?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          post_id?: string
          sort_boost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sound_catalog_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_catalog_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_catalog_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_context_votes: {
        Row: {
          created_at: string
          id: string
          source_post_id: string
          vote: number
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_post_id: string
          vote: number
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_post_id?: string
          vote?: number
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sound_context_votes_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_context_votes_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_context_votes_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_context_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spark_wallets: {
        Row: {
          paid_sparks_balance: number
          promo_sparks_balance: number
          total_sparks_purchased: number
          total_sparks_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          paid_sparks_balance?: number
          promo_sparks_balance?: number
          total_sparks_purchased?: number
          total_sparks_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          paid_sparks_balance?: number
          promo_sparks_balance?: number
          total_sparks_purchased?: number
          total_sparks_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spark_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_deals: {
        Row: {
          brand_name: string
          created_at: string
          ends_on: string | null
          est_value_cents: number | null
          id: string
          notes: string | null
          owner_staff_id: string | null
          stage: string
          starts_on: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string
          ends_on?: string | null
          est_value_cents?: number | null
          id?: string
          notes?: string | null
          owner_staff_id?: string | null
          stage?: string
          starts_on?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          ends_on?: string | null
          est_value_cents?: number | null
          id?: string
          notes?: string | null
          owner_staff_id?: string | null
          stage?: string
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_deals_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_activity: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      stream_gifts: {
        Row: {
          coin_cost: number
          created_at: string | null
          gift_emoji: string
          gift_id: string
          gift_name: string
          id: string
          idempotency_key: string | null
          quantity: number
          sender_id: string
          stream_id: string
        }
        Insert: {
          coin_cost?: number
          created_at?: string | null
          gift_emoji: string
          gift_id: string
          gift_name: string
          id?: string
          idempotency_key?: string | null
          quantity?: number
          sender_id: string
          stream_id: string
        }
        Update: {
          coin_cost?: number
          created_at?: string | null
          gift_emoji?: string
          gift_id?: string
          gift_name?: string
          id?: string
          idempotency_key?: string | null
          quantity?: number
          sender_id?: string
          stream_id?: string
        }
        Relationships: []
      }
      stream_messages: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string | null
          deleted_at: string | null
          display_name: string
          id: string
          is_host: boolean
          is_moderator: boolean
          is_subscriber: boolean
          message_type: string
          role: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          display_name: string
          id?: string
          is_host?: boolean
          is_moderator?: boolean
          is_subscriber?: boolean
          message_type?: string
          role?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          is_host?: boolean
          is_moderator?: boolean
          is_subscriber?: boolean
          message_type?: string
          role?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_pinned_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean
          pinned_by: string
          pinned_by_name: string
          stream_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          pinned_by: string
          pinned_by_name: string
          stream_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          pinned_by?: string
          pinned_by_name?: string
          stream_id?: string
        }
        Relationships: []
      }
      stream_poll_votes: {
        Row: {
          counts_applied: boolean
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          counts_applied?: boolean
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          counts_applied?: boolean
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "stream_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_polls: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          is_active: boolean
          options: Json
          question: string
          stream_id: string
          total_votes: number
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          options?: Json
          question: string
          stream_id: string
          total_votes?: number
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          options?: Json
          question?: string
          stream_id?: string
          total_votes?: number
        }
        Relationships: []
      }
      stream_questions: {
        Row: {
          answered_at: string | null
          author_name: string
          created_at: string
          id: string
          question: string
          status: string
          stream_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          author_name: string
          created_at?: string
          id?: string
          question: string
          status?: string
          stream_id: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          author_name?: string
          created_at?: string
          id?: string
          question?: string
          status?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_questions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_raids: {
        Row: {
          created_at: string | null
          from_host_name: string
          from_stream_id: string
          id: string
          to_stream_id: string
          viewer_count: number
        }
        Insert: {
          created_at?: string | null
          from_host_name: string
          from_stream_id: string
          id?: string
          to_stream_id: string
          viewer_count?: number
        }
        Update: {
          created_at?: string | null
          from_host_name?: string
          from_stream_id?: string
          id?: string
          to_stream_id?: string
          viewer_count?: number
        }
        Relationships: []
      }
      trigger_errors: {
        Row: {
          context: Json
          err_message: string | null
          err_state: string | null
          fn_name: string
          id: number
          occurred_at: string
          table_name: string | null
          tg_op: string | null
        }
        Insert: {
          context?: Json
          err_message?: string | null
          err_state?: string | null
          fn_name: string
          id?: number
          occurred_at?: string
          table_name?: string | null
          tg_op?: string | null
        }
        Update: {
          context?: Json
          err_message?: string | null
          err_state?: string | null
          fn_name?: string
          id?: number
          occurred_at?: string
          table_name?: string | null
          tg_op?: string | null
        }
        Relationships: []
      }
      user_analytics_consent: {
        Row: {
          ads_measurement_allowed: boolean
          analytics_allowed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ads_measurement_allowed?: boolean
          analytics_allowed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ads_measurement_allowed?: boolean
          analytics_allowed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          id: string
          total_purchased: number
          total_spent: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_purchased?: number
          total_spent?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_purchased?: number
          total_spent?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_feed_settings: {
        Row: {
          fatigue_break_snooze_until: string | null
          reduced_motion: boolean
          shift_feed_filter: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          fatigue_break_snooze_until?: string | null
          reduced_motion?: boolean
          shift_feed_filter?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          fatigue_break_snooze_until?: string | null
          reduced_motion?: boolean
          shift_feed_filter?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          id: string
          interest: string
          user_id: string
        }
        Insert: {
          id?: string
          interest: string
          user_id: string
        }
        Update: {
          id?: string
          interest?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          acquired_at: string
          acquisition_source: string
          acquisition_txn_id: string | null
          gifted_by_user_id: string | null
          gifted_to_user_id: string | null
          id: string
          is_equipped: boolean
          is_transferable: boolean
          item_kind: string
          metadata: Json
          shop_item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquisition_source: string
          acquisition_txn_id?: string | null
          gifted_by_user_id?: string | null
          gifted_to_user_id?: string | null
          id?: string
          is_equipped?: boolean
          is_transferable?: boolean
          item_kind?: string
          metadata?: Json
          shop_item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquisition_source?: string
          acquisition_txn_id?: string | null
          gifted_by_user_id?: string | null
          gifted_to_user_id?: string | null
          id?: string
          is_equipped?: boolean
          is_transferable?: boolean
          item_kind?: string
          metadata?: Json
          shop_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_acquisition_txn_id_fkey"
            columns: ["acquisition_txn_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_gifted_by_user_id_fkey"
            columns: ["gifted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_gifted_to_user_id_fkey"
            columns: ["gifted_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_monthly_pulse_scores: {
        Row: {
          computed_at: string
          finalized: boolean
          month_start: string
          overall: number
          range_: number
          reach: number
          reciprocity: number
          resonance: number
          rhythm: number
          tier: string
          user_id: string
        }
        Insert: {
          computed_at?: string
          finalized?: boolean
          month_start: string
          overall?: number
          range_?: number
          reach?: number
          reciprocity?: number
          resonance?: number
          rhythm?: number
          tier?: string
          user_id: string
        }
        Update: {
          computed_at?: string
          finalized?: boolean
          month_start?: string
          overall?: number
          range_?: number
          reach?: number
          reciprocity?: number
          resonance?: number
          rhythm?: number
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_monthly_pulse_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pulse_avatar_frames: {
        Row: {
          frame_id: string
          grant_source: string
          granted_at: string
          leaderboard_rank: number
          user_id: string
        }
        Insert: {
          frame_id: string
          grant_source?: string
          granted_at?: string
          leaderboard_rank: number
          user_id: string
        }
        Update: {
          frame_id?: string
          grant_source?: string
          granted_at?: string
          leaderboard_rank?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pulse_avatar_frames_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "pulse_avatar_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pulse_avatar_frames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pulse_lifetime: {
        Row: {
          anthem_months: number
          best_month_score: number
          best_month_start: string | null
          best_tier: string
          last_finalized_at: string | null
          lifetime_total: number
          months_active: number
          updated_at: string
          user_id: string
        }
        Insert: {
          anthem_months?: number
          best_month_score?: number
          best_month_start?: string | null
          best_tier?: string
          last_finalized_at?: string | null
          lifetime_total?: number
          months_active?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          anthem_months?: number
          best_month_score?: number
          best_month_start?: string | null
          best_tier?: string
          last_finalized_at?: string | null
          lifetime_total?: number
          months_active?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pulse_lifetime_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          id: string
          skill_name: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          skill_name: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          best_streak: number | null
          current_streak: number | null
          current_streak_days: number
          last_active_date: string | null
          longest_streak_days: number
          streak_started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          current_streak?: number | null
          current_streak_days?: number
          last_active_date?: string | null
          longest_streak_days?: number
          streak_started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_streak?: number | null
          current_streak?: number | null
          current_streak_days?: number
          last_active_date?: string | null
          longest_streak_days?: number
          streak_started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          revenuecat_customer_id: string | null
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          revenuecat_customer_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          revenuecat_customer_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voice_rooms: {
        Row: {
          community_id: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_live: boolean | null
          listener_count: number | null
          max_speakers: number | null
          speaker_ids: string[] | null
          title: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_live?: boolean | null
          listener_count?: number | null
          max_speakers?: number | null
          speaker_ids?: string[] | null
          title: string
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_live?: boolean | null
          listener_count?: number | null
          max_speakers?: number | null
          speaker_ids?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_rooms_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          creator_id: string | null
          direction: string
          id: string
          idempotency_key: string | null
          metadata: Json
          reserve_release_at: string | null
          source_id: string | null
          source_type: string | null
          status: string
          transaction_type: string
          user_id: string | null
          wallet_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id?: string | null
          direction: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reserve_release_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          transaction_type: string
          user_id?: string | null
          wallet_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string | null
          direction?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reserve_release_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          transaction_type?: string
          user_id?: string | null
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_export_runs: {
        Row: {
          finished_at: string | null
          id: string
          notes: string | null
          provider: string
          row_count: number | null
          started_at: string
          status: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          notes?: string | null
          provider: string
          row_count?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          notes?: string | null
          provider?: string
          row_count?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      webhook_outbox: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          destination_id: string | null
          event_type: string
          id: string
          last_attempted_at: string | null
          last_error: string | null
          next_attempt_at: string | null
          payload: Json
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          destination_id?: string | null
          event_type: string
          id?: string
          last_attempted_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          payload?: Json
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          destination_id?: string | null
          event_type?: string
          id?: string
          last_attempted_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_outbox_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "webhook_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_destinations: {
        Row: {
          created_at: string
          created_by: string | null
          event_types: string[]
          id: string
          is_active: boolean
          metadata: Json
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_types?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_types?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_destinations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_worker_state: {
        Row: {
          last_run_at: string | null
          last_status: string
          last_summary: Json
          singleton_key: string
          updated_at: string
        }
        Insert: {
          last_run_at?: string | null
          last_status?: string
          last_summary?: Json
          singleton_key?: string
          updated_at?: string
        }
        Update: {
          last_run_at?: string | null
          last_status?: string
          last_summary?: Json
          singleton_key?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      circle_replies_viewer_safe: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          reaction_count: number | null
          thread_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_replies_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "circle_threads_viewer_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_threads_viewer_safe: {
        Row: {
          author_id: string | null
          body: string | null
          community_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string | null
          kind: string | null
          linked_post_id: string | null
          media_thumb_url: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          reaction_count: number | null
          reply_count: number | null
          share_count: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: never
          body?: never
          community_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          kind?: string | null
          linked_post_id?: string | null
          media_thumb_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          reaction_count?: number | null
          reply_count?: number | null
          share_count?: number | null
          title?: never
          updated_at?: string | null
        }
        Update: {
          author_id?: never
          body?: never
          community_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          kind?: string | null
          linked_post_id?: string | null
          media_thumb_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          reaction_count?: number | null
          reply_count?: number | null
          share_count?: number | null
          title?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_threads_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_threads_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments_viewer_safe: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string | null
          like_count: number | null
          media_url: string | null
          parent_id: string | null
          post_id: string | null
          reaction_angry_count: number | null
          reaction_clap_count: number | null
          reaction_haha_count: number | null
          reaction_heart_count: number | null
          reaction_sad_count: number | null
          reaction_wow_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_media_jobs_ops_snapshot_v1: {
        Row: {
          awaiting_post_patch_count: number | null
          cancelled_count: number | null
          failed_count: number | null
          newest_queued_at: string | null
          next_queued_retry_at: string | null
          oldest_queued_at: string | null
          oldest_running_started_at: string | null
          queued_count: number | null
          running_count: number | null
          succeeded_count: number | null
        }
        Relationships: []
      }
      posts_viewer_safe: {
        Row: {
          additional_media: string[] | null
          allow_clip_downloads: boolean | null
          allow_remix: boolean | null
          allow_viewer_clips: boolean | null
          caption: string | null
          clip_end_seconds: number | null
          clip_start_seconds: number | null
          comment_count: number | null
          comments_disabled: boolean | null
          communities: string[] | null
          cover_alt_url: string | null
          created_at: string | null
          creator_id: string | null
          duet_layout_mode: string | null
          duet_parent_id: string | null
          edited_at: string | null
          education_citations: Json | null
          evidence_label: string | null
          evidence_url: string | null
          feed_type_eligible: string[] | null
          hashtags: string[] | null
          id: string | null
          is_anonymous: boolean | null
          is_education: boolean | null
          like_count: number | null
          location_context: string | null
          media_processing_error: string | null
          media_processing_job_id: string | null
          media_processing_status: string | null
          media_url: string | null
          mood_preset: string | null
          privacy_mode: string | null
          ranking_score: number | null
          reaction_angry_count: number | null
          reaction_clap_count: number | null
          reaction_haha_count: number | null
          reaction_heart_count: number | null
          reaction_sad_count: number | null
          reaction_wow_count: number | null
          role_context: string | null
          save_count: number | null
          scheduled_at: string | null
          scheduled_status: string | null
          series_id: string | null
          series_part: number | null
          series_total: number | null
          share_count: number | null
          shift_context: string | null
          sound_source_media_url: string | null
          sound_source_post_id: string | null
          sound_title: string | null
          source_creator_id: string | null
          source_live_stream_id: string | null
          source_post_id: string | null
          specialty_context: string | null
          stitch_source_post_id: string | null
          thumbnail_url: string | null
          type: string | null
          video_look_id: string | null
          video_overlay_text: string | null
          video_overlay_style: Json | null
          view_count: number | null
        }
        Insert: {
          additional_media?: string[] | null
          allow_clip_downloads?: boolean | null
          allow_remix?: boolean | null
          allow_viewer_clips?: boolean | null
          caption?: string | null
          clip_end_seconds?: number | null
          clip_start_seconds?: number | null
          comment_count?: number | null
          comments_disabled?: boolean | null
          communities?: string[] | null
          cover_alt_url?: string | null
          created_at?: string | null
          creator_id?: never
          duet_layout_mode?: string | null
          duet_parent_id?: string | null
          edited_at?: string | null
          education_citations?: Json | null
          evidence_label?: string | null
          evidence_url?: string | null
          feed_type_eligible?: string[] | null
          hashtags?: string[] | null
          id?: string | null
          is_anonymous?: boolean | null
          is_education?: boolean | null
          like_count?: number | null
          location_context?: string | null
          media_processing_error?: string | null
          media_processing_job_id?: string | null
          media_processing_status?: string | null
          media_url?: string | null
          mood_preset?: string | null
          privacy_mode?: string | null
          ranking_score?: number | null
          reaction_angry_count?: number | null
          reaction_clap_count?: number | null
          reaction_haha_count?: number | null
          reaction_heart_count?: number | null
          reaction_sad_count?: number | null
          reaction_wow_count?: number | null
          role_context?: string | null
          save_count?: number | null
          scheduled_at?: string | null
          scheduled_status?: string | null
          series_id?: string | null
          series_part?: number | null
          series_total?: number | null
          share_count?: number | null
          shift_context?: string | null
          sound_source_media_url?: string | null
          sound_source_post_id?: string | null
          sound_title?: string | null
          source_creator_id?: string | null
          source_live_stream_id?: string | null
          source_post_id?: string | null
          specialty_context?: string | null
          stitch_source_post_id?: string | null
          thumbnail_url?: string | null
          type?: string | null
          video_look_id?: string | null
          video_overlay_text?: string | null
          video_overlay_style?: Json | null
          view_count?: number | null
        }
        Update: {
          additional_media?: string[] | null
          allow_clip_downloads?: boolean | null
          allow_remix?: boolean | null
          allow_viewer_clips?: boolean | null
          caption?: string | null
          clip_end_seconds?: number | null
          clip_start_seconds?: number | null
          comment_count?: number | null
          comments_disabled?: boolean | null
          communities?: string[] | null
          cover_alt_url?: string | null
          created_at?: string | null
          creator_id?: never
          duet_layout_mode?: string | null
          duet_parent_id?: string | null
          edited_at?: string | null
          education_citations?: Json | null
          evidence_label?: string | null
          evidence_url?: string | null
          feed_type_eligible?: string[] | null
          hashtags?: string[] | null
          id?: string | null
          is_anonymous?: boolean | null
          is_education?: boolean | null
          like_count?: number | null
          location_context?: string | null
          media_processing_error?: string | null
          media_processing_job_id?: string | null
          media_processing_status?: string | null
          media_url?: string | null
          mood_preset?: string | null
          privacy_mode?: string | null
          ranking_score?: number | null
          reaction_angry_count?: number | null
          reaction_clap_count?: number | null
          reaction_haha_count?: number | null
          reaction_heart_count?: number | null
          reaction_sad_count?: number | null
          reaction_wow_count?: number | null
          role_context?: string | null
          save_count?: number | null
          scheduled_at?: string | null
          scheduled_status?: string | null
          series_id?: string | null
          series_part?: number | null
          series_total?: number | null
          share_count?: number | null
          shift_context?: string | null
          sound_source_media_url?: string | null
          sound_source_post_id?: string | null
          sound_title?: string | null
          source_creator_id?: string | null
          source_live_stream_id?: string | null
          source_post_id?: string | null
          specialty_context?: string | null
          stitch_source_post_id?: string | null
          thumbnail_url?: string | null
          type?: string | null
          video_look_id?: string | null
          video_overlay_text?: string | null
          video_overlay_style?: Json | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_duet_parent_id_fkey"
            columns: ["duet_parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_duet_parent_id_fkey"
            columns: ["duet_parent_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_duet_parent_id_fkey"
            columns: ["duet_parent_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_media_processing_job_id_fkey"
            columns: ["media_processing_job_id"]
            isOneToOne: false
            referencedRelation: "creator_media_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_sound_source_post_id_fkey"
            columns: ["sound_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_sound_source_post_id_fkey"
            columns: ["sound_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_sound_source_post_id_fkey"
            columns: ["sound_source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_creator_id_fkey"
            columns: ["source_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_live_stream_id_fkey"
            columns: ["source_live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_stitch_source_post_id_fkey"
            columns: ["stitch_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_stitch_source_post_id_fkey"
            columns: ["stitch_source_post_id"]
            isOneToOne: false
            referencedRelation: "posts_viewer_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_stitch_source_post_id_fkey"
            columns: ["stitch_source_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts_due_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts_due_v1: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _apply_stream_poll_option_tally: {
        Args: { p_option_id: string; p_poll_id: string }
        Returns: undefined
      }
      _bump_streak_internal: { Args: { p_user_id: string }; Returns: undefined }
      _economy_clip_gift_split_config: { Args: never; Returns: Json }
      _economy_diamond_hold_days: { Args: never; Returns: number }
      _economy_gift_spend_order: { Args: never; Returns: string[] }
      _economy_is_admin: { Args: never; Returns: boolean }
      _economy_normalize_handle: { Args: { p: string }; Returns: string }
      _economy_setting_json: { Args: { p_key: string }; Returns: Json }
      _economy_sparks_to_diamonds: {
        Args: { p_sparks: number }
        Returns: number
      }
      _economy_sync_user_pulse_frame_from_shop_item: {
        Args: { p_shop_item_id: string; p_user_id: string }
        Returns: undefined
      }
      _economy_user_notify: {
        Args: {
          p_body: string
          p_data: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      _record_clip_gift_attribution: {
        Args: {
          p_clip_publisher_id: string
          p_context_id: string
          p_context_type: string
          p_creator_gift_id: string
          p_diamonds_earned: number
          p_sparks_spent: number
        }
        Returns: undefined
      }
      _update_user_streak_internal: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_border_catalog_create_monthly_champions: {
        Args: { p_month_label: string; p_season_code: string }
        Returns: Json
      }
      admin_delete_sound_catalog: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      webhook_outbox_claim_batch: {
        Args: {
          p_limit?: number
          p_max_attempts?: number
          p_min_age_seconds?: number
          p_stale_lock_seconds?: number
        }
        Returns: {
          attempts: number
          created_at: string
          delivered_at: string | null
          destination_id: string | null
          event_type: string
          id: string
          last_attempted_at: string | null
          last_error: string | null
          next_attempt_at: string | null
          payload: Json
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_post_set_privacy_mode: {
        Args: { p_post_id: string; p_privacy_mode: string }
        Returns: undefined
      }
      admin_profile_set_is_verified: {
        Args: { p_is_verified: boolean; p_target_user_id: string }
        Returns: undefined
      }
      admin_profile_set_role_admin: {
        Args: { p_role_admin: boolean; p_target_user_id: string }
        Returns: undefined
      }
      admin_shop_border_stats: {
        Args: never
        Returns: {
          acq_free: number
          acq_paid: number
          acq_staff: number
          owners: number
          shop_item_id: string
          staff_grant_count: number
        }[]
      }
      admin_upsert_sound_catalog: {
        Args: {
          p_artist?: string
          p_is_active?: boolean
          p_keywords?: string
          p_post_id: string
          p_sort_boost?: number
        }
        Returns: string
      }
      append_engagement_event: {
        Args: {
          p_event_type: string
          p_payload?: Json
          p_target_id: string
          p_target_kind: string
          p_user_id: string
        }
        Returns: undefined
      }
      border_catalog_leaderboard_rank_defaults: {
        Args: { p_rank: number }
        Returns: {
          prestige_score: number
          rarity_tier: string
          visual_tier: string
        }[]
      }
      bump_community_profile_open: {
        Args: { p_community_id: string }
        Returns: undefined
      }
      bump_streak: { Args: never; Returns: undefined }
      can_moderate_circle: {
        Args: { p_community_id: string }
        Returns: boolean
      }
      can_moderate_circle_for_user: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      cast_stream_poll_vote: {
        Args: { p_option_id: string; p_poll_id: string }
        Returns: Json
      }
      check_username_available: {
        Args: { candidate: string }
        Returns: boolean
      }
      circle_digest_window_bounds: {
        Args: { p_at?: string }
        Returns: {
          window_end: string
          window_start: string
        }[]
      }
      circle_digest_window_minutes: { Args: never; Returns: number }
      circle_notify_direct_max: { Args: never; Returns: number }
      claim_next_creator_media_job: {
        Args: never
        Returns: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          encode_complete: boolean
          error: string | null
          id: string
          idempotency_key: string | null
          input: Json
          kind: string
          last_error_code: string | null
          max_attempts: number
          next_retry_at: string | null
          output: Json | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_media_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_pulse_beta_border: { Args: never; Returns: Json }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      community_is_confessions: {
        Args: { p_community_id: string }
        Returns: boolean
      }
      compute_pulse_subscores: {
        Args: { p_month_start: string; p_user_id: string }
        Returns: {
          overall: number
          range_: number
          reach: number
          reciprocity: number
          resonance: number
          rhythm: number
          tier: string
        }[]
      }
      create_creator_tip_and_apply_earnings: {
        Args: {
          p_amount: number
          p_message?: string
          p_post_id?: string
          p_to_creator_id: string
        }
        Returns: string
      }
      create_live_clip_draft: {
        Args: {
          p_caption: string
          p_category: string
          p_end_seconds: number
          p_hashtags: string[]
          p_marker_id: string
          p_start_seconds: number
          p_stream_id: string
          p_title: string
        }
        Returns: Json
      }
      create_live_clip_marker: {
        Args: { p_duration_seconds?: number; p_stream_id: string }
        Returns: Json
      }
      economy_accept_pending_border_gift: {
        Args: { p_border_gift_id: string }
        Returns: Json
      }
      economy_admin_grant_shop_item: {
        Args: {
          p_idempotency_key?: string
          p_note?: string
          p_recipient_user_id: string
          p_shop_item_id: string
        }
        Returns: Json
      }
      economy_claim_free_shop_border: {
        Args: { p_shop_item_id: string }
        Returns: Json
      }
      economy_create_or_get_wallets: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      economy_equip_border: {
        Args: { p_inventory_item_id: string }
        Returns: undefined
      }
      economy_gift_border_from_valid_receipt: {
        Args: {
          p_note: string
          p_purchase_receipt_id: string
          p_recipient_handle: string
          p_sender_user_id: string
          p_shop_item_id: string
        }
        Returns: string
      }
      economy_grant_border_from_valid_receipt: {
        Args: { p_purchase_receipt_id: string; p_shop_item_id: string }
        Returns: string
      }
      economy_grant_sparks_from_valid_receipt: {
        Args: { p_purchase_receipt_id: string }
        Returns: string
      }
      economy_release_pending_diamonds: { Args: never; Returns: number }
      economy_send_creator_gift: {
        Args: {
          p_context_id?: string | null
          p_context_type: string
          p_creator_user_id: string
          p_gift_item_id: string
          p_idempotency_key: string
        }
        Returns: string
      }
      economy_send_live_stream_gift: {
        Args: {
          p_gift_emoji: string
          p_gift_id: string
          p_gift_name: string
          p_idempotency_key: string
          p_quantity: number
          p_stream_id: string
          p_unit_spark_cost: number
        }
        Returns: string
      }
      end_live_stream: { Args: { p_stream_id: string }; Returns: Json }
      extract_handles: { Args: { body: string }; Returns: string[] }
      finalize_current_month: { Args: never; Returns: number }
      format_circle_digest_message: {
        Args: {
          p_community_name: string
          p_is_confessions: boolean
          p_post_count: number
        }
        Returns: string
      }
      generate_live_clip: { Args: { p_clip_id: string }; Returns: Json }
      generate_unique_username: {
        Args: { fallback_seed?: string; preferred_seed: string }
        Returns: string
      }
      get_clip_gift_earnings_snapshot: {
        Args: { p_creator_id: string }
        Returns: Json
      }
      get_community_card_stats: {
        Args: { p_ids: string[] }
        Returns: {
          avatar_urls: string[]
          community_id: string
          member_count: number
          online_count: number
          post_count: number
        }[]
      }
      get_current_pulse_score: {
        Args: { p_user_id?: string }
        Returns: {
          month_start: string
          overall: number
          range_: number
          reach: number
          reciprocity: number
          resonance: number
          rhythm: number
          streak_days: number
          tier: string
        }[]
      }
      get_daily_active_users: {
        Args: { days_back?: number }
        Returns: {
          active_users: number
          day: string
        }[]
      }
      get_feed_exclusions: { Args: { viewer_uuid: string }; Returns: Json }
      get_for_you_post_ids: {
        Args: { result_limit?: number; viewer_uuid: string }
        Returns: {
          id: string
        }[]
      }
      get_live_clip_download_url: { Args: { p_clip_id: string }; Returns: Json }
      get_mutual_follow_ids: {
        Args: { viewer: string }
        Returns: {
          creator_id: string
        }[]
      }
      get_post_reactions: { Args: { p_post_id: string }; Returns: Json }
      get_pulse_history: {
        Args: { p_user_id?: string }
        Returns: {
          anthem_months: number
          best_month_score: number
          best_tier: string
          finalized: boolean
          lifetime_total: number
          month_start: string
          months_active: number
          overall: number
          range_: number
          reach: number
          reciprocity: number
          resonance: number
          rhythm: number
          tier: string
        }[]
      }
      get_pulse_month_celebration: {
        Args: never
        Returns: {
          frame_glow_color: string
          frame_label: string
          frame_ring_caption: string
          frame_ring_color: string
          global_rank: number
          is_top5: boolean
          month_start: string
          overall: number
          prize_tier: string
          tier: string
          total_ranked: number
        }[]
      }
      get_ranked_feed: {
        Args: { cursor_ts?: string; feed_limit?: number; viewer_id: string }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      get_ranked_feed_v2: {
        Args: { cursor_ts?: string; feed_limit?: number; viewer_id: string }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      get_ranked_feed_v3: {
        Args: {
          exclude_post_ids?: string[]
          feed_limit?: number
          viewer_id: string
        }
        Returns: {
          post_id: string
          score: number
          source: string
        }[]
      }
      get_top_current_pulse: {
        Args: { p_circle_id?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          month_start: string
          overall: number
          tier: string
          user_id: string
          username: string
        }[]
      }
      get_top_events: {
        Args: { days_back?: number }
        Returns: {
          count: number
          name: string
        }[]
      }
      get_top_lifetime_pulse: {
        Args: { p_circle_id?: string; p_limit?: number }
        Returns: {
          anthem_months: number
          avatar_url: string
          best_month_score: number
          best_tier: string
          display_name: string
          lifetime_total: number
          months_active: number
          user_id: string
          username: string
        }[]
      }
      admin_list_profiles: {
        Args: { p_search?: string | null; p_admins_only?: boolean; p_limit?: number }
        Returns: {
          id: string
          display_name: string
          username: string | null
          avatar_url: string | null
          role: string
          is_verified: boolean
          role_admin: boolean
          created_at: string
          post_count: number
          follower_count: number
        }[]
      }
      current_user_role_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_top_today: {
        Args: { feed_limit?: number }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      get_top_today_v2: {
        Args: {
          exclude_post_ids?: string[]
          feed_limit?: number
          viewer_uuid?: string
        }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      get_viral_sounds_this_week: {
        Args: { p_limit?: number; p_title_filter?: string }
        Returns: {
          creator_avatar_url: string
          creator_display_name: string
          creator_id: string
          last_remix_at: string
          media_url: string
          remix_count_7d: number
          sound_title: string
          source_post_id: string
          thumbnail_url: string
        }[]
      }
      grant_pulse_top5_frames_for_month: {
        Args: { p_month: string }
        Returns: number
      }
      increment_ad_click: { Args: { campaign_id: string }; Returns: undefined }
      increment_ad_impression: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_creator_earnings: {
        Args: { p_tip_id: string }
        Returns: undefined
      }
      increment_poll_vote: {
        Args: { p_option_id: string; p_poll_id: string }
        Returns: undefined
      }
      is_circle_moderator: {
        Args: { p_community_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_member_of_community: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_valid_username: { Args: { s: string }; Returns: boolean }
      live_fanout_go_live_notifications: {
        Args: { p_stream_id: string }
        Returns: number
      }
      live_host_touch_heartbeat: {
        Args: { p_stream_id: string }
        Returns: boolean
      }
      live_leave_stream_attendance: {
        Args: { p_stream_id: string }
        Returns: number
      }
      live_mark_broadcast_started: {
        Args: { p_stream_id: string }
        Returns: boolean
      }
      live_purge_stale_stream_attendance: {
        Args: { p_stream_id: string; p_ttl?: string }
        Returns: undefined
      }
      live_stream_viewer_joinable: {
        Args: { p_stream_id: string }
        Returns: Json
      }
      live_sync_stream_viewer_count: {
        Args: { p_stream_id: string }
        Returns: number
      }
      live_touch_stream_attendance: {
        Args: { p_stream_id: string }
        Returns: number
      }
      log_trigger_error: {
        Args: {
          p_context?: Json
          p_fn: string
          p_message: string
          p_op: string
          p_state: string
          p_table: string
        }
        Returns: undefined
      }
      notification_message_preview: {
        Args: { p_fallback: string; p_max_len?: number; p_raw: string }
        Returns: string
      }
      notify_large_circle_post_digest: {
        Args: {
          p_community_id: string
          p_creator_id: string
          p_post_id: string
          p_redact_actor: boolean
        }
        Returns: undefined
      }
      pin_profile_update: { Args: { p_update_id: string }; Returns: undefined }
      process_circle_post_notification_fanout: {
        Args: { p_job_limit?: number }
        Returns: number
      }
      pulse_current_month: { Args: never; Returns: string }
      pulse_month_floor: { Args: { ts: string }; Returns: string }
      pulse_tier_from_score: { Args: { p_overall: number }; Returns: string }
      record_mentions: {
        Args: {
          p_author_id: string
          p_body: string
          p_content_id: string
          p_content_type: string
          p_message: string
          p_notify_target_id?: string
        }
        Returns: undefined
      }
      recount_community_posts: {
        Args: { target_id: string }
        Returns: undefined
      }
      recover_stale_creator_media_jobs: {
        Args: { p_after_seconds?: number }
        Returns: number
      }
      refresh_profile_follow_counts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      review_live_clip_marker: {
        Args: { p_decision: string; p_marker_id: string }
        Returns: Json
      }
      reward_deliveries_list_pending: {
        Args: never
        Returns: {
          acknowledged_at: string | null
          created_at: string
          delivery_type: string
          id: string
          idempotency_key: string
          item_id: string | null
          item_type: string
          metadata: Json
          opened_at: string | null
          quantity: number | null
          source_display_name: string | null
          source_user_id: string | null
          status: string
          toast_shown_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reward_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reward_delivery_enqueue_border_self: {
        Args: {
          p_inventory_item_id: string
          p_metadata?: Json
          p_shop_item_id: string
        }
        Returns: string
      }
      reward_delivery_enqueue_client: {
        Args: {
          p_delivery_type: string
          p_idempotency_key: string
          p_item_id?: string
          p_item_type: string
          p_metadata?: Json
          p_quantity?: number
          p_source_display_name?: string
          p_source_user_id?: string
        }
        Returns: string
      }
      reward_delivery_enqueue_sparks_pack: {
        Args: {
          p_metadata?: Json
          p_purchase_receipt_id: string
          p_quantity: number
          p_shop_item_id: string
        }
        Returns: string
      }
      reward_delivery_set_status: {
        Args: { p_id: string; p_next: string }
        Returns: boolean
      }
      search_hashtags: {
        Args: { p_limit?: number; p_prefix: string }
        Returns: {
          tag: string
          usage_count: number
        }[]
      }
      search_sound_library: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          creator_avatar_url: string
          creator_display_name: string
          creator_id: string
          media_url: string
          post_id: string
          remix_count: number
          sound_title: string
          thumbnail_url: string
        }[]
      }
      set_selected_pulse_avatar_frame: {
        Args: { p_frame_id: string }
        Returns: undefined
      }
      slugify_username: { Args: { seed: string }; Returns: string }
      toggle_profile_update_like: {
        Args: { p_update_id: string }
        Returns: boolean
      }
      transfer_gift_coins: {
        Args: { amount: number; sender_uid: string; stream_uid: string }
        Returns: undefined
      }
      unpin_profile_update: {
        Args: { p_update_id: string }
        Returns: undefined
      }
      update_live_stream_clip_settings: {
        Args: {
          p_allow_clip_downloads?: boolean
          p_require_host_approval?: boolean
          p_stream_id: string
          p_viewer_clips_allowed?: boolean
        }
        Returns: Json
      }
      update_ranking_scores: { Args: never; Returns: undefined }
      update_user_streak: { Args: never; Returns: Json }
      user_can_moderate_community: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      user_can_react_to_circle_thread: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      user_is_member_of_all_post_communities: {
        Args: { p_communities: string[]; p_user_id: string }
        Returns: boolean
      }
      username_passes_content_policy: { Args: { s: string }; Returns: boolean }
      viewer_can_read_circle_reply_row: {
        Args: {
          p_author_id: string
          p_community_id: string
          p_moderation_status: string
        }
        Returns: boolean
      }
      viewer_can_read_circle_thread_row: {
        Args: {
          p_author_id: string
          p_community_id: string
          p_deleted_at: string
          p_moderation_status: string
        }
        Returns: boolean
      }
      viewer_can_read_post_row: {
        Args: { p_creator_id: string; p_privacy_mode: string }
        Returns: boolean
      }
      viewer_is_staff: { Args: never; Returns: boolean }
      viewer_safe_circle_author_id: {
        Args: { p_author_id: string; p_community_id: string }
        Returns: string
      }
      viewer_safe_creator_id: {
        Args: { p_creator_id: string; p_is_anonymous: boolean }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
