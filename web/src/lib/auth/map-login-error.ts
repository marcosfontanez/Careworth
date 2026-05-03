/** Map Supabase Auth API messages to short, user-facing copy. */
export function mapLoginErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("confirm your email")) {
    return "Confirm your email first (check your inbox for the link from PulseVerse).";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  return "Sign-in failed. Check your email and password.";
}
