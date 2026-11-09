import {
  createContext,
  createEffect,
  createSignal,
  createMemo,
  onCleanup,
  useContext,
} from 'solid-js';
import type { Component, JSX, Context } from 'solid-js';
import type { ConvexClient } from 'convex/browser';
import type {
  AuthTokenFetcher,
  UseClerkAuth,
  ConvexAuthState,
  AuthStateSnapshot,
} from './types.js';
import { safeAuthAccess } from './utils.js';

// --- Contexts ---

const ConvexClientContext: Context<ConvexClient | undefined> =
  createContext<ConvexClient>();
const ConvexAuthContext = createContext<ConvexAuthState>();

// --- Context hooks ---

export function useConvexClient(): ConvexClient {
  const ctx = useContext(ConvexClientContext);
  if (!ctx) {
    throw new Error(
      'useConvexClient must be used within <ConvexProviderWithClerk>',
    );
  }
  return ctx;
}

export function useConvexAuth(): ConvexAuthState {
  const ctx = useContext(ConvexAuthContext);
  if (!ctx) {
    throw new Error(
      'useConvexAuth must be used within <ConvexProviderWithClerk>',
    );
  }
  return ctx;
}

// --- Provider ---

export interface ConvexProviderWithClerkProps {
  client: ConvexClient;
  useAuth: UseClerkAuth;
  children: JSX.Element;
}

/**
 * Throw on a missing or malformed `client` / `useAuth` prop. A misconfigured
 * provider must fail loudly at mount instead of rendering children with no
 * working auth bridge.
 */
function assertValidProps(props: ConvexProviderWithClerkProps): void {
  const client: unknown = props.client;
  if (
    !client ||
    typeof (client as { setAuth?: unknown }).setAuth !== 'function'
  ) {
    throw new Error(
      'ConvexProviderWithClerk: `client` must be a ConvexClient instance. Check that your Convex deployment URL (e.g. VITE_CONVEX_URL) is set.',
    );
  }
  if (typeof props.useAuth !== 'function') {
    throw new Error(
      "ConvexProviderWithClerk: `useAuth` must be Clerk's useAuth hook from @resonant-projects/clerk-solidjs.",
    );
  }
}

export const ConvexProviderWithClerk: Component<
  ConvexProviderWithClerkProps
> = props => {
  assertValidProps(props);

  const [isConvexAuthenticated, setIsConvexAuthenticated] = createSignal<
    boolean | null
  >(null);

  // Non-reactive snapshot for comparison to avoid unnecessary setAuth calls
  let previousAuthState: AuthStateSnapshot | null = null;

  const createAuthAdapter = createMemo(() => {
    return () => {
      const auth = props.useAuth();

      const fetchAccessToken: AuthTokenFetcher = async ({
        forceRefreshToken,
      }) => {
        try {
          // `await` so a rejected getToken() is caught here and fails closed
          // (null token = unauthenticated) instead of escaping to Convex.
          return await auth.getToken({
            template: 'convex',
            skipCache: forceRefreshToken,
          });
        } catch {
          return null;
        }
      };

      const isLoaded = safeAuthAccess(auth.isLoaded);
      const isSignedIn = safeAuthAccess(auth.isSignedIn);

      return {
        isLoading: !isLoaded,
        isAuthenticated: isSignedIn ?? false,
        fetchAccessToken,
        orgId: auth.orgId,
        orgRole: auth.orgRole,
      } as const;
    };
  });

  createEffect(() => {
    try {
      const { isLoading, isAuthenticated, fetchAccessToken, orgId, orgRole } =
        createAuthAdapter()();

      const currentAuthState: AuthStateSnapshot = {
        isLoading,
        isAuthenticated,
        orgId: safeAuthAccess(orgId),
        orgRole: safeAuthAccess(orgRole),
      };

      // Skip if auth state unchanged (e.g., just a token refresh)
      if (
        JSON.stringify(previousAuthState) === JSON.stringify(currentAuthState)
      ) {
        return;
      }

      if (isLoading) {
        setIsConvexAuthenticated(null);
      } else if (isAuthenticated) {
        props.client.setAuth(fetchAccessToken, backendReportsAuthenticated => {
          setIsConvexAuthenticated(() => backendReportsAuthenticated);
        });
      } else {
        // Clear Convex auth when signed out
        props.client.setAuth(
          async () => null,
          () => {},
        );
        setIsConvexAuthenticated(false);
      }

      previousAuthState = currentAuthState;
    } catch (error) {
      console.error('Error in Convex auth effect:', error);
      setIsConvexAuthenticated(false);
      previousAuthState = null;
    }
  });

  onCleanup(() => {
    try {
      props.client.setAuth(
        async () => null,
        () => {},
      );
    } catch (error) {
      console.error('Error cleaning up Convex auth:', error);
    }
  });

  // Context values are read once by the Provider, so expose reactive getters:
  // consumers then track the backend-confirmed auth state as it changes.
  const contextValue: ConvexAuthState = {
    get isLoading() {
      return isConvexAuthenticated() === null;
    },
    get isAuthenticated() {
      return isConvexAuthenticated() ?? false;
    },
  };

  const client = createMemo(() => props.client);

  return (
    <ConvexClientContext.Provider value={client() as ConvexClient}>
      <ConvexAuthContext.Provider value={contextValue}>
        {props.children}
      </ConvexAuthContext.Provider>
    </ConvexClientContext.Provider>
  );
};
