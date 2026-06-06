export type CircleReplySort = "new" | "top" | "helpful";

export type SortableReply = {
  createdAt: string | null;
  reactionCount: number;
  helpfulCount: number;
};

export function sortCircleReplies<T extends SortableReply>(replies: T[], sort: CircleReplySort): T[] {
  const list = [...replies];
  if (sort === "new") {
    return list.sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
  }
  if (sort === "helpful") {
    return list.sort(
      (a, b) =>
        b.helpfulCount - a.helpfulCount ||
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    );
  }
  return list.sort(
    (a, b) =>
      b.reactionCount - a.reactionCount ||
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
}
