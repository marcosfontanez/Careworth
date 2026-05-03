import { Redirect } from 'expo-router';

/** Sign up is shown on the premium combined auth screen (`/auth/login?mode=signup`). */
export default function SignupScreen() {
  return <Redirect href="/auth/login?mode=signup" />;
}
