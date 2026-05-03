/** Map Supabase Auth API messages/codes to short, user-facing copy. */
export function mapLoginErrorMessage(message: string, code?: string | null): string {
  const m = message.toLowerCase();
  const c = (code ?? "").toLowerCase().replace(/-/g, "_");

  if (
    c === "email_not_confirmed" ||
    m.includes("email not confirmed") ||
    m.includes("confirm your email")
  ) {
    return "Confirm your email first (open the link Supabase sent when you signed up), then try again.";
  }
  if (
    m.includes("invalid api key") ||
    m.includes("invalid apikey") ||
    c === "invalid_api_key"
  ) {
    return "Deployment misconfiguration: the Supabase anon key does not match this project. In Vercel → Project → Settings → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the same Supabase project (Dashboard → Project Settings → API → anon/public key, not the service_role key). Remove extra spaces, save for Production, then Redeploy.";
  }
  if (
    c === "invalid_credentials" ||
    c === "invalid_grant" ||
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("invalid login")
  ) {
    return "Wrong email or password. If you usually sign in with Google or Apple in the app, use “Forgot password” in the app (or Supabase) to set an email password for the web.";
  }
  if (
    m.includes("email rate limit exceeded") ||
    (m.includes("rate limit") && m.includes("email")) ||
    m.includes("over_email_send_rate_limit")
  ) {
    return "Too many confirmation emails were sent recently. Wait about an hour and try again, or sign in with Apple or Google if you already have an account.";
  }
  if (m.includes("too many requests") || m.includes("rate limit") || c.includes("over_request_rate")) {
    return "Too many sign-in attempts. Wait a few minutes and try again.";
  }
  if (m.includes("user_banned") || m.includes("banned")) {
    return "This account cannot sign in. Contact support if you think this is a mistake.";
  }
  if (message.trim().length > 0) {
    return message;
  }
  return "Sign-in failed. Check your email and password.";
}
