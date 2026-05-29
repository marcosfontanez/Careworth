import type { PrivacyMode, UserProfile } from '@/types';

export type CreatorClipDefaults = {
  defaultAllowViewerClips: boolean;
  defaultAllowRemix: boolean;
  defaultAllowClipDownloads: boolean;
};

export type PostClipSettings = {
  allowViewerClips: boolean;
  allowRemix: boolean;
  allowClipDownloads: boolean;
};

/** Profile-level defaults for new uploads (migration 212). */
export function clipDefaultsFromProfile(
  profile?: Pick<
    UserProfile,
    'defaultAllowViewerClips' | 'defaultAllowRemix' | 'defaultAllowClipDownloads'
  > | null,
): CreatorClipDefaults {
  return {
    defaultAllowViewerClips: profile?.defaultAllowViewerClips ?? true,
    defaultAllowRemix: profile?.defaultAllowRemix ?? true,
    defaultAllowClipDownloads: profile?.defaultAllowClipDownloads ?? false,
  };
}

/** Seed post-level toggles from profile defaults + upload privacy. */
export function initialPostClipSettings(
  privacy: Extract<PrivacyMode, 'public' | 'followers'>,
  defaults: CreatorClipDefaults,
): PostClipSettings {
  if (privacy !== 'public') {
    return {
      allowViewerClips: false,
      allowRemix: false,
      allowClipDownloads: false,
    };
  }
  return {
    allowViewerClips: defaults.defaultAllowViewerClips,
    allowRemix: defaults.defaultAllowRemix,
    allowClipDownloads: defaults.defaultAllowClipDownloads,
  };
}
