import { createMemo, createEffect } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { useAuth } from 'clerk-solidjs';
import type { AuthGuardConfig, AuthGuardResult } from './types';

/**
 * Configurable auth guard hook.
 * Checks authentication, roles, permissions, and features — redirects if unauthorized.
 */
export function useAuthGuard(config: AuthGuardConfig = {}): AuthGuardResult {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    requireAuth = true,
    requireRoles = [],
    requirePermissions = [],
    requireFeatures = [],
    featureChecker,
    redirectTo = '/sign-in',
    onUnauthorized,
  } = config;

  const authorizationStatus = createMemo(() => {
    if (!auth.isLoaded()) {
      return { status: 'loading' as const, reason: 'Auth not loaded' };
    }

    if (requireAuth && !auth.isSignedIn()) {
      return {
        status: 'unauthorized' as const,
        reason: 'Authentication required',
      };
    }

    // Check roles via Clerk's has() method
    if (requireRoles.length > 0) {
      const hasRequiredRole = requireRoles.some(role =>
        (auth as any).has({ role }),
      );
      if (!hasRequiredRole) {
        return {
          status: 'unauthorized' as const,
          reason: 'Missing required role(s)',
        };
      }
    }

    // Check permissions via Clerk's has() method
    if (requirePermissions.length > 0) {
      const hasRequiredPermission = requirePermissions.some(permission =>
        (auth as any).has({ permission }),
      );
      if (!hasRequiredPermission) {
        return {
          status: 'unauthorized' as const,
          reason: 'Missing required permission(s)',
        };
      }
    }

    // Check features via user-provided checker
    if (requireFeatures.length > 0) {
      if (!featureChecker) {
        console.warn(
          'useAuthGuard: requireFeatures specified but no featureChecker provided',
        );
        return {
          status: 'unauthorized' as const,
          reason: 'No feature checker configured',
        };
      }

      const result = featureChecker(requireFeatures);

      if (result.isLoading) {
        return {
          status: 'loading' as const,
          reason: 'Loading feature access',
        };
      }

      if (!result.hasAccess) {
        return {
          status: 'unauthorized' as const,
          reason:
            result.reason ??
            `Missing required feature(s): ${requireFeatures.join(', ')}`,
        };
      }
    }

    return { status: 'authorized' as const, reason: 'All checks passed' };
  });

  // Redirect on unauthorized
  createEffect(() => {
    const status = authorizationStatus();
    if (status.status === 'unauthorized') {
      onUnauthorized?.(status.reason);
      if (redirectTo) {
        if (
          redirectTo === '/sign-in' ||
          redirectTo.startsWith('/sign-in')
        ) {
          const currentPath = location.pathname + location.search;
          const redirectUrl = redirectTo.includes('?')
            ? `${redirectTo}&redirectTo=${encodeURIComponent(currentPath)}`
            : `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`;
          navigate(redirectUrl);
        } else {
          navigate(redirectTo);
        }
      }
    }
  });

  return {
    isLoading: () => authorizationStatus().status === 'loading',
    isAuthorized: () => authorizationStatus().status === 'authorized',
    isUnauthorized: () => authorizationStatus().status === 'unauthorized',
    authorizationStatus,
  };
}

// --- Convenience hooks ---

export function useRequireAuth(redirectTo = '/sign-in') {
  return useAuthGuard({ requireAuth: true, redirectTo });
}

export function useRequireRole(role: string, redirectTo = '/unauthorized') {
  return useAuthGuard({ requireRoles: [role], redirectTo });
}

export function useRequirePermission(
  permission: string,
  redirectTo = '/unauthorized',
) {
  return useAuthGuard({ requirePermissions: [permission], redirectTo });
}

export function useRequireFeature(
  feature: string,
  featureChecker: AuthGuardConfig['featureChecker'],
  redirectTo = '/unauthorized',
) {
  return useAuthGuard({
    requireFeatures: [feature],
    featureChecker,
    redirectTo,
  });
}
