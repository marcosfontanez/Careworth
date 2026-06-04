import { Redirect } from 'expo-router';

/**
 * Green Screen is now a mode inside the unified B-roll Studio. This legacy route
 * stays for old deep links / shortcuts and forwards into B-roll Studio with the
 * Green Screen mode preselected. B-roll Studio re-gates on its own feature flags.
 */
export default function GreenScreenStudioRedirect() {
  return <Redirect href={'/create/broll-studio?mode=greenScreen' as never} />;
}
