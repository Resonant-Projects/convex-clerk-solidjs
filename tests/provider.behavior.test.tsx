import { describe, expect, test } from 'bun:test';
import { createRoot, createSignal } from 'solid-js';
import {
  ConvexProviderWithClerk,
  useConvexAuth,
  useConvexClient,
} from '../src/provider.js';
import type { ClerkAuth, ConvexAuthState } from '../src/types.js';
import { createMockClerkAuth, createMockConvexClient } from './helpers.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function mount(client: unknown, useAuth: unknown) {
  let auth!: ConvexAuthState;
  let resolvedClient: unknown;
  const Probe = () => {
    auth = useConvexAuth();
    resolvedClient = useConvexClient();
    return null;
  };
  const dispose = createRoot(dispose => {
    // Deliberately untyped: these tests pass invalid props on purpose.
    const props: any = { client, useAuth };
    <ConvexProviderWithClerk {...props}>
      <Probe />
    </ConvexProviderWithClerk>;
    return dispose;
  });
  return { auth: () => auth, client: () => resolvedClient, dispose };
}

describe('ConvexProviderWithClerk configuration errors fail loudly', () => {
  const useAuth = () => createMockClerkAuth();

  test.each([
    ['undefined client', undefined],
    ['null client', null],
    ['client without setAuth', {}],
  ])('throws for %s', (_label, client) => {
    expect(() => mount(client, useAuth)).toThrow(
      /`client` must be a ConvexClient instance/,
    );
  });

  test('throws when useAuth is not a function', () => {
    const { client } = createMockConvexClient();
    expect(() => mount(client, undefined)).toThrow(
      /`useAuth` must be Clerk's useAuth hook/,
    );
  });
});

describe('ConvexProviderWithClerk auth lifecycle', () => {
  test('stays loading and never calls setAuth while Clerk is loading', () => {
    const { client, calls } = createMockConvexClient();
    const auth = createMockClerkAuth({ isLoaded: false });
    const view = mount(client, () => auth);

    expect(calls.setAuth).toHaveLength(0);
    expect(view.auth().isLoading).toBe(true);
    expect(view.auth().isAuthenticated).toBe(false);
    view.dispose();
  });

  test('signed out: clears Convex auth and reports unauthenticated', async () => {
    const { client, calls } = createMockConvexClient();
    const view = mount(client, () =>
      createMockClerkAuth({ isSignedIn: false }),
    );

    expect(calls.setAuth).toHaveLength(1);
    expect(
      await calls.setAuth[0]!.fetchToken({ forceRefreshToken: false }),
    ).toBe(null);
    expect(view.auth().isLoading).toBe(false);
    expect(view.auth().isAuthenticated).toBe(false);
    expect(view.client()).toBe(client);
    view.dispose();
  });

  test('signed in: authenticated only once the Convex backend confirms', () => {
    const { client, calls } = createMockConvexClient();
    const view = mount(client, () => createMockClerkAuth({ isSignedIn: true }));

    expect(calls.setAuth).toHaveLength(1);
    expect(view.auth().isLoading).toBe(true);
    expect(view.auth().isAuthenticated).toBe(false);

    calls.setAuth[0]!.onChange(true);
    expect(view.auth().isLoading).toBe(false);
    expect(view.auth().isAuthenticated).toBe(true);

    // Backend rejects the token (e.g. wrong JWT issuer / applicationID).
    calls.setAuth[0]!.onChange(false);
    expect(view.auth().isAuthenticated).toBe(false);
    view.dispose();
  });

  test('token fetcher requests the convex template and maps skipCache', async () => {
    const { client, calls } = createMockConvexClient();
    const requests: unknown[] = [];
    const auth = createMockClerkAuth({
      isSignedIn: true,
      getToken: async opts => {
        requests.push(opts);
        return 'jwt';
      },
    });
    const view = mount(client, () => auth);
    const fetchToken = calls.setAuth[0]!.fetchToken;

    expect(await fetchToken({ forceRefreshToken: true })).toBe('jwt');
    expect(requests).toEqual([{ template: 'convex', skipCache: true }]);
    view.dispose();
  });

  test('token fetcher fails closed (null) when getToken rejects', async () => {
    const { client, calls } = createMockConvexClient();
    const auth = createMockClerkAuth({
      isSignedIn: true,
      getToken: async () => {
        throw new Error('network down');
      },
    });
    const view = mount(client, () => auth);

    expect(
      await calls.setAuth[0]!.fetchToken({ forceRefreshToken: false }),
    ).toBeNull();
    view.dispose();
  });

  test('a throwing useAuth (no ClerkProvider) fails closed', () => {
    const { client, calls } = createMockConvexClient();
    const originalError = console.error;
    console.error = () => {};
    try {
      const view = mount(client, () => {
        throw new Error('useAuth can only be used within <ClerkProvider>');
      });
      expect(calls.setAuth).toHaveLength(0);
      expect(view.auth().isLoading).toBe(false);
      expect(view.auth().isAuthenticated).toBe(false);
      view.dispose();
    } finally {
      console.error = originalError;
    }
  });

  test('reacts to sign-out after sign-in', async () => {
    const { client, calls } = createMockConvexClient();
    const [signedIn, setSignedIn] = createSignal(true);
    const auth: ClerkAuth = createMockClerkAuth({ isSignedIn: signedIn });
    const view = mount(client, () => auth);

    calls.setAuth[0]!.onChange(true);
    expect(view.auth().isAuthenticated).toBe(true);

    setSignedIn(false);
    await flush();
    expect(calls.setAuth).toHaveLength(2);
    expect(
      await calls.setAuth[1]!.fetchToken({ forceRefreshToken: false }),
    ).toBeNull();
    expect(view.auth().isAuthenticated).toBe(false);
    view.dispose();
  });

  test('clears Convex auth on unmount', async () => {
    const { client, calls } = createMockConvexClient();
    const view = mount(client, () => createMockClerkAuth({ isSignedIn: true }));
    view.dispose();

    const last = calls.setAuth.at(-1)!;
    expect(calls.setAuth).toHaveLength(2);
    expect(await last.fetchToken({ forceRefreshToken: false })).toBeNull();
  });
});
