import { Alert } from 'react-native';

interface RateLimitConfig {
  maxActions: number;
  windowMs: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  post: { maxActions: 10, windowMs: 3600000 },
  comment: { maxActions: 30, windowMs: 3600000 },
  report: { maxActions: 5, windowMs: 3600000 },
  like: { maxActions: 100, windowMs: 3600000 },
  follow: { maxActions: 50, windowMs: 3600000 },
};

const actionTimestamps: Record<string, number[]> = {};

export function checkRateLimit(action: string): boolean {
  const config = LIMITS[action];
  if (!config) return true;

  const now = Date.now();
  const key = action;

  if (!actionTimestamps[key]) {
    actionTimestamps[key] = [];
  }

  actionTimestamps[key] = actionTimestamps[key].filter(
    (ts) => now - ts < config.windowMs
  );

  if (actionTimestamps[key].length >= config.maxActions) {
    const minutesLeft = Math.ceil(
      (config.windowMs - (now - actionTimestamps[key][0])) / 60000
    );
    Alert.alert(
      'Slow down',
      `You've reached the limit for this action. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
    );
    return false;
  }

  actionTimestamps[key].push(now);
  return true;
}

export function resetRateLimits() {
  Object.keys(actionTimestamps).forEach((key) => {
    actionTimestamps[key] = [];
  });
}
