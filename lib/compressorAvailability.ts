import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import { NativeModules, TurboModuleRegistry } from 'react-native';

/** Codegen name from `react-native-compressor` package.json (`RNCompressorSpec`). */
const COMPRESSOR_SPEC_NAMES = ['RNCompressorSpec', 'Compressor', 'RNCompressor'] as const;

/**
 * True when running inside Expo Go — custom native modules (compressor) are unavailable.
 */
export function isExpoGoClient(): boolean {
  try {
    return (
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      Constants.appOwnership === AppOwnership.Expo
    );
  } catch {
    return false;
  }
}

function turboCompressorRegistered(): boolean {
  try {
    for (const name of COMPRESSOR_SPEC_NAMES) {
      try {
        const mod = TurboModuleRegistry.get(name);
        if (mod != null) return true;
      } catch {
        /* get may throw on some RN builds — try next name */
      }
    }
  } catch {
    /* noop */
  }
  return false;
}

function legacyNativeCompressorRegistered(): boolean {
  try {
    const nm = NativeModules as Record<string, unknown>;
    for (const name of COMPRESSOR_SPEC_NAMES) {
      if (nm[name] != null) return true;
    }
  } catch {
    /* noop */
  }
  return false;
}

/**
 * When false, do not `require('react-native-compressor')` — its JS entry validates the
 * TurboModule and throws a fatal error if pods/native weren't rebuilt after install.
 */
export function isReactNativeCompressorLinked(): boolean {
  if (isExpoGoClient()) return false;
  return turboCompressorRegistered() || legacyNativeCompressorRegistered();
}
