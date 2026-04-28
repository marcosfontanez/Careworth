const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

/**
 * Sentry must wrap the Expo Metro config — otherwise `@sentry/react-native`
 * pulls web replay / browser-utils into the iOS/Android graph and Metro fails
 * resolving `@sentry/core` ESM internals (`./carrier.js`, etc.).
 * @see https://docs.sentry.io/platforms/react-native/manual-setup/metro/
 */
const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });

/** Improves compatibility with packages that use `exports` + extensioned ESM paths. */
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = withNativeWind(config, { input: './global.css' });
