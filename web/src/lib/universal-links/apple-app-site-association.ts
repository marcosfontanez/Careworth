/**
 * Apple Universal Links — `apple-app-site-association` JSON.
 * @see https://developer.apple.com/documentation/xcode/supporting-associated-domains
 *
 * Set env on Vercel / hosting:
 *   APPLE_UNIVERSAL_LINKS_APP_ID = "<APPLE_TEAM_ID>.com.pulseverse.app"
 * (Team ID is 10 characters in Apple Developer → Membership)
 */
export function buildAppleAppSiteAssociation(appId: string): {
  applinks: { apps: []; details: { appID: string; paths: string[] }[] };
} {
  const id = appId.trim();
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: id,
          paths: [
            "/communities/*",
            "/community/*",
            "/post/*",
            "/profile/*",
            "/jobs/*",
            "/messages/*",
            "/comments/*",
          ],
        },
      ],
    },
  };
}
