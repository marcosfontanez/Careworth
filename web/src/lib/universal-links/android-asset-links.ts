/**
 * Android App Links — Digital Asset Links JSON array.
 * @see https://developer.android.com/training/app-links/verify-android-applinks
 *
 * Env:
 *   ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS — comma-separated SHA-256 fingerprints
 *   (e.g. from `keytool -list -v -keystore …` or Play Console → App signing)
 */
export function buildAndroidAssetLinks(packageName: string, fingerprints: string[]): unknown[] {
  const fps = fingerprints.map((s) => s.trim()).filter(Boolean);
  if (fps.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fps,
      },
    },
  ];
}
