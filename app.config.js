const { NON_STANDARD_SYMBOL } = require('@expo/config/build/environment');

/**
 * Dynamic Expo config — `config` is the merged `expo` object from app.json (see @expo/config getContextConfig).
 * Mark merged static config usage so expo-doctor does not flag app.json as unused.
 *
 * Sentry Expo plugin reads organization + project at prebuild.
 * Set in EAS: Project → Environment variables → SENTRY_ORG, SENTRY_PROJECT
 */
function patchPlugins(plugins) {
  const org = process.env.SENTRY_ORG ?? '';
  const project = process.env.SENTRY_PROJECT ?? '';
  const list = Array.isArray(plugins) ? plugins : [];
  return list.map((entry) => {
    if (Array.isArray(entry) && entry[0] === '@sentry/react-native') {
      const prev = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
      return [
        '@sentry/react-native',
        {
          ...prev,
          organization: org || prev.organization || '',
          project: project || prev.project || '',
        },
      ];
    }
    return entry;
  });
}

module.exports = ({ config }) => ({
  [NON_STANDARD_SYMBOL]: true,
  expo: {
    ...config,
    plugins: patchPlugins(config.plugins ?? []),
    /** Bare workflow: string required; `{ policy: "appVersion" }` is managed-only. */
    runtimeVersion: String(config.version),
  },
});
