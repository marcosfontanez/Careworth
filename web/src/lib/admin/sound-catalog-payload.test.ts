import { describe, expect, it } from "vitest";

import { sanitizeSoundPreviewUrl } from "./sound-catalog-payload";

describe("sanitizeSoundPreviewUrl", () => {
  it("allows public post-media HTTPS URLs", () => {
    const url =
      "https://example.supabase.co/storage/v1/object/public/post-media/user/clip.mp4";
    expect(sanitizeSoundPreviewUrl(url)).toBe(url);
  });

  it("rejects signed URLs and non-HTTPS", () => {
    expect(
      sanitizeSoundPreviewUrl(
        "https://example.supabase.co/storage/v1/object/sign/post-media/user/clip.mp4?token=x",
      ),
    ).toBeNull();
    expect(sanitizeSoundPreviewUrl("http://insecure.example/clip.mp4")).toBeNull();
    expect(sanitizeSoundPreviewUrl("/storage/v1/object/public/post-media/x.mp4")).toBeNull();
  });
});
