import { create } from 'zustand';
import type { UserProfile, FeedType, PulseAvatarFrame } from '@/types';
import { profilesService } from '@/services/supabase';

interface AppState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  feedTab: FeedType;
  savedPostIds: Set<string>;
  savedJobIds: Set<string>;
  followedCreatorIds: Set<string>;
  joinedCommunityIds: Set<string>;

  /** When true, the beta tester gift modal is visible — monthly celebration waits. */
  betaTesterBorderBlocking: boolean;
  setBetaTesterBorderBlocking: (val: boolean) => void;
  /**
   * Survives screen remounts (e.g. leaving `/auth/legal-ack`). The gate presents the modal once
   * `inAuth` is false and terms are accepted.
   */
  betaTesterGiftPending: { userId: string; frame: PulseAvatarFrame } | null;
  setBetaTesterGiftPending: (v: { userId: string; frame: PulseAvatarFrame } | null) => void;
  clearBetaTesterGiftPending: () => void;

  setCurrentUser: (user: UserProfile | null) => void;
  setAuthenticated: (val: boolean) => void;
  setFeedTab: (tab: FeedType) => void;
  toggleSavePost: (id: string) => void;
  toggleSaveJob: (id: string) => void;
  toggleFollowCreator: (id: string) => void;
  toggleJoinCommunity: (id: string) => void;
  /** Replace local joined set from server (e.g. after profile load). */
  setJoinedCommunityIdsFromServer: (communityIds: string[]) => void;
  setCommunityJoined: (communityId: string, joined: boolean) => void;
  /** Replace the local followed-creator set from the server (e.g. after auth). */
  setFollowedCreatorIdsFromServer: (creatorIds: string[]) => void;
  /** Replace bookmark ids from `saved_posts` after sign-in (feed bookmark chip). */
  setSavedPostIdsFromServer: (postIds: string[]) => void;
  setCreatorFollowed: (creatorId: string, followed: boolean) => void;
  syncFromSupabase: (userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  feedTab: 'forYou',
  savedPostIds: new Set(),
  savedJobIds: new Set(),
  followedCreatorIds: new Set(),
  joinedCommunityIds: new Set(),

  betaTesterBorderBlocking: false,
  betaTesterGiftPending: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setBetaTesterBorderBlocking: (val) => set({ betaTesterBorderBlocking: val }),
  setBetaTesterGiftPending: (v) => set({ betaTesterGiftPending: v }),
  clearBetaTesterGiftPending: () => set({ betaTesterGiftPending: null }),

  setFeedTab: (tab) => set({ feedTab: tab }),

  toggleSavePost: (id) =>
    set((state) => {
      const next = new Set(state.savedPostIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { savedPostIds: next };
    }),

  toggleSaveJob: (id) =>
    set((state) => {
      const next = new Set(state.savedJobIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { savedJobIds: next };
    }),

  toggleFollowCreator: (id) =>
    set((state) => {
      const next = new Set(state.followedCreatorIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { followedCreatorIds: next };
    }),

  toggleJoinCommunity: (id) =>
    set((state) => {
      const next = new Set(state.joinedCommunityIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { joinedCommunityIds: next };
    }),

  setJoinedCommunityIdsFromServer: (communityIds) =>
    set({ joinedCommunityIds: new Set(communityIds) }),

  setCommunityJoined: (communityId, joined) =>
    set((state) => {
      const next = new Set(state.joinedCommunityIds);
      if (joined) next.add(communityId);
      else next.delete(communityId);
      return { joinedCommunityIds: next };
    }),

  setFollowedCreatorIdsFromServer: (creatorIds) =>
    set({ followedCreatorIds: new Set(creatorIds) }),

  setSavedPostIdsFromServer: (postIds) =>
    set({ savedPostIds: new Set(postIds) }),

  setCreatorFollowed: (creatorId, followed) =>
    set((state) => {
      const next = new Set(state.followedCreatorIds);
      if (followed) next.add(creatorId);
      else next.delete(creatorId);
      return { followedCreatorIds: next };
    }),

  syncFromSupabase: async (userId: string) => {
    try {
      const profile = await profilesService.getById(userId);
      if (profile) {
        set({
          currentUser: profile,
          isAuthenticated: true,
        });
      }
    } catch {}
  },
}));
