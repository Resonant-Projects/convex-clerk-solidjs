import type { ClerkAuth, ConvexAuthState, AuthTokenFetcher } from '../src/types';

/**
 * Creates a mock ConvexClient that tracks setAuth/mutation/action calls.
 */
export function createMockConvexClient() {
  const calls: {
    setAuth: Array<{ fetchToken: AuthTokenFetcher; onChange: (v: boolean) => void }>;
    mutation: Array<{ ref: any; args: any }>;
    action: Array<{ ref: any; args: any }>;
    query: Array<{ ref: any; args: any }>;
    onUpdate: Array<{ ref: any; args: any; callback: (v: any) => void }>;
  } = {
    setAuth: [],
    mutation: [],
    action: [],
    query: [],
    onUpdate: [],
  };

  const client = {
    setAuth(fetchToken: AuthTokenFetcher, onChange: (v: boolean) => void) {
      calls.setAuth.push({ fetchToken, onChange });
    },
    clearAuth() {
      // noop — ConvexClient may not expose this
    },
    mutation(ref: any, args: any) {
      calls.mutation.push({ ref, args });
      return Promise.resolve({ success: true });
    },
    action(ref: any, args: any) {
      calls.action.push({ ref, args });
      return Promise.resolve({ result: 'ok' });
    },
    query(ref: any, args: any) {
      calls.query.push({ ref, args });
      return Promise.resolve(undefined);
    },
    onUpdate(ref: any, args: any, callback: (v: any) => void, _errorCallback?: (e: any) => void) {
      calls.onUpdate.push({ ref, args, callback });
      return () => {}; // unsubscribe
    },
  };

  return { client: client as any, calls };
}

/**
 * Creates controllable mock Clerk auth signals.
 */
export function createMockClerkAuth(overrides: Partial<ClerkAuth> = {}): ClerkAuth {
  return {
    isLoaded: true,
    isSignedIn: false,
    getToken: async () => 'mock-token',
    orgId: null,
    orgRole: null,
    ...overrides,
  };
}

/**
 * Creates a useAuth mock that returns the given auth state.
 */
export function createMockUseAuth(auth: ClerkAuth) {
  return () => auth;
}
