import { create } from 'zustand';
import type { UserProfile, FeedType, OnboardingData } from '@/types';
import { profilesService } from '@/services/supabase';
import { profileFromOnboarding } from '@/store/profileFromOnboarding';

interface AppState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  feedTab: FeedType;
  savedPostIds: Set<string>;
  savedJobIds: Set<string>;
  followedCreatorIds: Set<string>;
  joinedCommunityIds: Set<string>;

  /** When true, the beta tester gift modal is visible — monthly celebration waits. */
  betaTesterBorderBlocking: boolean;
  setBetaTesterBorderBlocking: (val: boolean) => void;

  setCurrentUser: (user: UserProfile | null) => void;
  setAuthenticated: (val: boolean) => void;
  setOnboardingComplete: (val: boolean) => void;
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
  setCreatorFollowed: (creatorId: string, followed: boolean) => void;
  completeOnboarding: (data: OnboardingData) => void;
  syncFromSupabase: (userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  feedTab: 'forYou',
  savedPostIds: new Set(),
  savedJobIds: new Set(),
  followedCreatorIds: new Set(),
  joinedCommunityIds: new Set(),

  betaTesterBorderBlocking: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setOnboardingComplete: (val) => set({ hasCompletedOnboarding: val }),
  setBetaTesterBorderBlocking: (val) => set({ betaTesterBorderBlocking: val }),

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

  setCreatorFollowed: (creatorId, followed) =>
    set((state) => {
      const next = new Set(state.followedCreatorIds);
      if (followed) next.add(creatorId);
      else next.delete(creatorId);
      return { followedCreatorIds: next };
    }),

  completeOnboarding: (data) =>
    set((state) => {
      const id = state.currentUser?.id ?? '';
      return {
        currentUser: profileFromOnboarding(data, id),
        joinedCommunityIds: new Set(data.communitiesToFollow),
        hasCompletedOnboarding: true,
        isAuthenticated: true,
      };
    }),

  syncFromSupabase: async (userId: string) => {
    try {
      const profile = await profilesService.getById(userId);
      if (profile) {
        set({
          currentUser: profile,
          isAuthenticated: true,
          hasCompletedOnboarding: true,
        });
      }
    } catch {}
  },
}));
