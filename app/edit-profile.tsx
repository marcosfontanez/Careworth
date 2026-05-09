import { Redirect } from 'expo-router';

/** Legacy route — all customization lives under Customize My Pulse. */
export default function EditProfileRedirect() {
  return <Redirect href="/my-pulse-appearance" />;
}
