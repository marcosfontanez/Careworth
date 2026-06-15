"use server";

import {
  adminAddCircleModerator,
  adminAddPostPin,
  adminArchiveCircle,
  adminCreateCircle,
  adminRemoveCircleModerator,
  adminRemovePostPin,
  adminSetFeaturedOrder,
  adminUpdateCircle,
  adminUpdateCircleIdentity,
} from "@/lib/admin/circle-admin-mutations";

export async function createCircleAction(input: {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  categories?: string;
}) {
  const categories = input.categories
    ? input.categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return adminCreateCircle({ ...input, categories });
}

export async function updateCircleAction(
  communityId: string,
  patch: {
    name?: string;
    description?: string;
    icon?: string;
    accentColor?: string;
    categories?: string;
  },
) {
  const categories =
    patch.categories !== undefined
      ? patch.categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
  return adminUpdateCircle(communityId, { ...patch, categories });
}

export async function setFeaturedOrderAction(communityId: string, featuredOrder: number | null) {
  return adminSetFeaturedOrder(communityId, featuredOrder);
}

export async function archiveCircleAction(communityId: string, archived: boolean) {
  return adminArchiveCircle(communityId, archived);
}

export async function addPostPinAction(communityId: string, postId: string) {
  return adminAddPostPin(communityId, postId);
}

export async function removePostPinAction(communityId: string, postId: string) {
  return adminRemovePostPin(communityId, postId);
}

export async function addCircleModeratorAction(communityId: string, userId: string) {
  return adminAddCircleModerator(communityId, userId);
}

export async function removeCircleModeratorAction(communityId: string, userId: string) {
  return adminRemoveCircleModerator(communityId, userId);
}

export async function updateCircleIdentityAction(
  communityId: string,
  identity: { welcomeCopy?: string; welcomeThreadId?: string; rules?: string },
) {
  const rules = identity.rules
    ? identity.rules
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return adminUpdateCircleIdentity(communityId, { ...identity, rules });
}
