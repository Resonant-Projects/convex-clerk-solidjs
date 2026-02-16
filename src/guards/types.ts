import type { JSX } from 'solid-js';

/**
 * Result from a feature checker — tells the guard whether the user has access.
 */
export interface FeatureCheckResult {
  isLoading: boolean;
  hasAccess: boolean;
  reason?: string;
}

/**
 * A function that checks whether the user has access to the required features.
 * Consumers implement this with their own feature gating backend (Stripe, LaunchDarkly, PostHog, etc.)
 */
export type FeatureChecker = (requiredFeatures: string[]) => FeatureCheckResult;

/**
 * Configuration for useAuthGuard.
 */
export interface AuthGuardConfig {
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Clerk organization roles required (checked via auth.has()) */
  requireRoles?: string[];
  /** Clerk organization permissions required (checked via auth.has()) */
  requirePermissions?: string[];
  /** Feature keys to check via the featureChecker callback */
  requireFeatures?: string[];
  /** Custom feature checker function — required if requireFeatures is set */
  featureChecker?: FeatureChecker;
  /** Path to redirect to when unauthorized (default: '/sign-in') */
  redirectTo?: string;
  /** Fallback component to render while loading */
  fallback?: () => JSX.Element;
  /** Callback when authorization fails */
  onUnauthorized?: (reason: string) => void;
}

/**
 * The authorization status at any point in time.
 */
export type AuthorizationStatus =
  | { status: 'loading'; reason: string }
  | { status: 'authorized'; reason: string }
  | { status: 'unauthorized'; reason: string };

/**
 * Return value from useAuthGuard.
 */
export interface AuthGuardResult {
  isLoading: () => boolean;
  isAuthorized: () => boolean;
  isUnauthorized: () => boolean;
  authorizationStatus: () => AuthorizationStatus;
}
