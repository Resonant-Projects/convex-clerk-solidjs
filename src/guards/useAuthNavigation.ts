import { useNavigate } from '@solidjs/router';
import { useAuth } from 'clerk-solidjs';

/**
 * Auth-aware navigation helpers.
 * Provides utilities for navigating with authentication checks
 * and handling post-auth redirects.
 */
export function useAuthNavigation() {
  const auth = useAuth();
  const navigate = useNavigate();

  /**
   * Navigate to a path, optionally requiring auth first.
   * If auth is required and user is not signed in, redirects to sign-in
   * with the target path as a return URL.
   */
  const navigateWithAuth = (path: string, requireAuth = false) => {
    if (requireAuth && !auth.isSignedIn()) {
      navigate(`/sign-in?redirectTo=${encodeURIComponent(path)}`);
      return;
    }
    navigate(path);
  };

  /**
   * After authentication, redirect to the original requested path
   * or fall back to a default path.
   */
  const redirectAfterAuth = (fallbackPath = '/dashboard') => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirectTo') ?? fallbackPath;
    navigate(redirectTo);
  };

  return {
    navigateWithAuth,
    redirectAfterAuth,
    isAuthenticated: auth.isSignedIn,
  };
}
