import type { Accessor } from 'solid-js';

/**
 * Token fetcher function expected by ConvexClient.setAuth().
 * Not exported publicly by the Convex browser client.
 */
export type AuthTokenFetcher = (args: {
  forceRefreshToken: boolean;
}) => Promise<string | null>;

/**
 * Minimal duck-typed interface for the Convex client.
 * Allows the provider to work with any client that satisfies this contract.
 */
export interface IConvexClient {
  setAuth(
    fetchToken: AuthTokenFetcher,
    onChange: (isAuthed: boolean) => void,
  ): void;
  clearAuth(): void;
}

/**
 * Clerk's useAuth() return type — the subset we use.
 * Accepts both raw values AND Accessor<T> (provider resolves internally).
 */
export interface ClerkAuth {
  isLoaded: boolean | Accessor<boolean>;
  isSignedIn: boolean | undefined | Accessor<boolean | undefined>;
  getToken: (opts: {
    template?: string;
    skipCache?: boolean;
  }) => Promise<string | null>;
  orgId?: string | null | Accessor<string | null>;
  orgRole?: string | null | Accessor<string | null>;
}

/**
 * Hook type that returns ClerkAuth.
 * Typically this is Clerk's useAuth().
 */
export type UseClerkAuth = () => ClerkAuth;

/**
 * Auth state exposed by the provider to child components.
 */
export interface ConvexAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Internal snapshot for comparison to avoid unnecessary setAuth calls.
 */
export interface AuthStateSnapshot {
  isLoading: boolean;
  isAuthenticated: boolean;
  orgId: string | null | undefined;
  orgRole: string | null | undefined;
}
