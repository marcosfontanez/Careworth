/**
 * One-time beta tester avatar border gift (see `BetaTesterBorderGate`).
 * Set `EXPO_PUBLIC_BETA_TESTER_BORDER=0` in builds/env after public launch to hide
 * the modal; the `claim_pulse_beta_border` RPC stays idempotent on the server.
 */
export const BETA_TESTER_BORDER_REWARD_ENABLED =
  process.env.EXPO_PUBLIC_BETA_TESTER_BORDER !== '0';
