import {
  createContext,
  createEffect,
  createSignal,
  createMemo,
  onCleanup,
  useContext,
} from 'solid-js';
import type { Component, JSX, Accessor, Context } from 'solid-js';
import type { ConvexClient } from 'convex/browser';
import type {
  AuthTokenFetcher,
  UseClerkAuth,
  ConvexAuthState,
  AuthStateSnapshot,
} from './types';
import { safeAuthAccess } from './utils';

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

export const ConvexProviderWithClerk: Component<
  ConvexProviderWithClerkProps
> = props => {
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
          return auth.getToken({
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

  const contextValue: Accessor<ConvexAuthState> = () => ({
    isLoading: isConvexAuthenticated() === null,
    isAuthenticated: isConvexAuthenticated() ?? false,
  });

  const client = createMemo(() => props.client);

  return (
    <ConvexClientContext.Provider value={client() as ConvexClient}>
      <ConvexAuthContext.Provider value={contextValue()}>
        {props.children}
      </ConvexAuthContext.Provider>
    </ConvexClientContext.Provider>
  );
};
