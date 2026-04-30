const appJson = require('./app.json');

/**
 * Sentry Expo plugin reads organization + project at prebuild.
 * Set in EAS: Project → Environment variables → SENTRY_ORG, SENTRY_PROJECT
 * (or export locally before `npx expo prebuild`).
 */
function patchPlugins(plugins) {
  const org = process.env.SENTRY_ORG ?? '';
  const project = process.env.SENTRY_PROJECT ?? '';
  return plugins.map((entry) => {
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

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: patchPlugins(appJson.expo.plugins),
  },
};
