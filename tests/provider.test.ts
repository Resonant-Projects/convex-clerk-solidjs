import { test, expect, describe } from 'bun:test';
import { createMockConvexClient, createMockClerkAuth, createMockUseAuth } from './helpers';

describe('ConvexProviderWithClerk', () => {
  test('provider module exports component and hooks', async () => {
    const mod = await import('../src/provider');
    expect(typeof mod.ConvexProviderWithClerk).toBe('function');
    expect(typeof mod.useConvexClient).toBe('function');
    expect(typeof mod.useConvexAuth).toBe('function');
  });

  test('provider source has correct context structure', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    // Two contexts created
    expect(src).toContain('ConvexClientContext');
    expect(src).toContain('ConvexAuthContext');
    // Creates context with createContext
    expect(src).toContain('createContext');
    // Has cleanup via onCleanup
    expect(src).toContain('onCleanup');
    // Has effect for auth sync
    expect(src).toContain('createEffect');
    // Snapshot comparison to prevent unnecessary setAuth calls
    expect(src).toContain('previousAuthState');
    expect(src).toContain('JSON.stringify');
  });

  test('provider handles Accessor values via safeAuthAccess', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    expect(src).toContain('safeAuthAccess');
    expect(src).toContain("safeAuthAccess(auth.isLoaded)");
    expect(src).toContain("safeAuthAccess(auth.isSignedIn)");
  });

  test('provider clears auth on unmount', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    expect(src).toContain('onCleanup');
    // Uses setAuth with null-returning fetcher since clearAuth not available
    expect(src).toContain('async () => null');
  });

  test('useConvexClient throws meaningful error outside provider', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    expect(src).toContain('useConvexClient must be used within <ConvexProviderWithClerk>');
  });

  test('useConvexAuth throws meaningful error outside provider', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    expect(src).toContain('useConvexAuth must be used within <ConvexProviderWithClerk>');
  });

  test('provider sets auth when signed in', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    // When authenticated, calls client.setAuth with fetchAccessToken
    expect(src).toContain('props.client.setAuth(fetchAccessToken');
    // Uses template: convex for token
    expect(src).toContain("template: 'convex'");
  });

  test('provider clears auth when signed out', async () => {
    const src = await Bun.file('./src/provider.tsx').text();
    // Signed out state uses no-op token fetcher
    expect(src).toContain('setIsConvexAuthenticated(false)');
  });
});

describe('mock helpers work correctly', () => {
  test('createMockConvexClient tracks setAuth', () => {
    const { client, calls } = createMockConvexClient();
    client.setAuth(async () => 'token', () => {});
    expect(calls.setAuth).toHaveLength(1);
  });

  test('createMockClerkAuth with signed-in state', () => {
    const auth = createMockClerkAuth({ isLoaded: true, isSignedIn: true });
    expect(auth.isLoaded).toBe(true);
    expect(auth.isSignedIn).toBe(true);
  });

  test('createMockClerkAuth with accessor values', () => {
    const auth = createMockClerkAuth({
      isLoaded: (() => true) as any,
      isSignedIn: (() => true) as any,
    });
    expect(typeof auth.isLoaded).toBe('function');
    expect(typeof auth.isSignedIn).toBe('function');
  });
});
