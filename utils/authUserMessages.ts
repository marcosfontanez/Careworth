/** Maps Supabase Auth errors to short copy for in-app alerts. */
export function mapAuthErrorForAlert(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (
    m.includes('email rate limit exceeded') ||
    (m.includes('rate limit') && m.includes('email')) ||
    m.includes('over_email_send_rate_limit')
  ) {
    return 'Too many confirmation emails were sent recently. Please wait about an hour and try again, or use Sign in with Apple or Google.';
  }
  if (m.includes('too many requests') || m.includes('rate limit') || m.includes('over_request_rate')) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (m.includes('sms') && (m.includes('failed') || m.includes('error') || m.includes('twilio'))) {
    return 'SMS could not be sent. If you are on a Twilio trial, verify this number in Twilio first. Otherwise check Supabase Phone provider and Twilio geo permissions.';
  }
  if (m.includes('invalid to number') || m.includes('invalid phone') || m.includes('is invalid')) {
    return 'That phone number could not be used. Include country code (e.g. +1 5551234567).';
  }
  return rawMessage;
}
