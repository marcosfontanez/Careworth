import type { Router } from 'expo-router';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';

/**
 * Land on login after an intentional sign-out.
 * Use `replace` only — `dismissAll()` dispatches POP_TO_TOP and errors when no modal stack exists.
 */
export function navigateToLoginAfterSignOut(router: Router): void {
  resetRootIndexRedirectDedupe();
  router.replace('/auth/login');
}
