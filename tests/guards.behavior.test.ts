import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createRoot, createSignal } from 'solid-js';
import type { AuthGuardConfig } from '../src/guards/types.js';

// --- Module mocks: a controllable Clerk auth and router ---
const [isLoaded, setIsLoaded] = createSignal(true);
const [isSignedIn, setIsSignedIn] = createSignal<boolean | undefined>(false);
let grants: Array<Record<string, string>> = [];
const navigations: string[] = [];
let locationSearch = '';

mock.module('@resonant-projects/clerk-solidjs', () => ({
  useAuth: () => ({
    isLoaded,
    isSignedIn,
    has: (params: Record<string, string>) =>
      grants.some(g =>
        Object.entries(params).every(([key, value]) => g[key] === value),
      ),
  }),
}));

mock.module('@solidjs/router', () => ({
  useNavigate: () => (path: string) => navigations.push(path),
  useLocation: () => ({ pathname: '/admin', search: '?tab=1' }),
}));

const { useAuthGuard, useRequireRole } = await import(
  '../src/guards/useAuthGuard.js'
);
const { useAuthNavigation } = await import(
  '../src/guards/useAuthNavigation.js'
);

function guard(config: AuthGuardConfig = {}) {
  return createRoot(dispose => ({ result: useAuthGuard(config), dispose }));
}

beforeEach(() => {
  setIsLoaded(true);
  setIsSignedIn(false);
  grants = [];
  navigations.length = 0;
  locationSearch = '';
  globalThis.window = {
    location: {
      get search() {
        return locationSearch;
      },
    },
  } as unknown as Window & typeof globalThis;
});

describe('useAuthGuard route protection', () => {
  test('loading Clerk is neither authorized nor redirected', () => {
    setIsLoaded(false);
    const { result, dispose } = guard();
    expect(result.isLoading()).toBe(true);
    expect(result.isAuthorized()).toBe(false);
    expect(navigations).toEqual([]);
    dispose();
  });

  test('signed-out user is denied and sent to sign-in with a return path', () => {
    const reasons: string[] = [];
    const { result, dispose } = guard({ onUnauthorized: r => reasons.push(r) });
    expect(result.isUnauthorized()).toBe(true);
    expect(result.isAuthorized()).toBe(false);
    expect(reasons).toEqual(['Authentication required']);
    expect(navigations).toEqual([
      `/sign-in?redirectTo=${encodeURIComponent('/admin?tab=1')}`,
    ]);
    dispose();
  });

  test('signed-in user without the required role is denied', () => {
    setIsSignedIn(true);
    grants = [{ role: 'org:member' }];
    const { result, dispose } = createRoot(dispose => ({
      result: useRequireRole('org:admin'),
      dispose,
    }));
    expect(result.isUnauthorized()).toBe(true);
    expect(navigations).toEqual(['/unauthorized']);
    dispose();
  });

  test('signed-in user with the required role and permission is authorized', () => {
    setIsSignedIn(true);
    grants = [{ role: 'org:admin' }, { permission: 'org:billing:manage' }];
    const { result, dispose } = guard({
      requireRoles: ['org:admin'],
      requirePermissions: ['org:billing:manage'],
    });
    expect(result.isAuthorized()).toBe(true);
    expect(navigations).toEqual([]);
    dispose();
  });

  test('missing permission is denied', () => {
    setIsSignedIn(true);
    const { result, dispose } = guard({
      requirePermissions: ['org:billing:manage'],
    });
    expect(result.authorizationStatus()).toEqual({
      status: 'unauthorized',
      reason: 'Missing required permission(s)',
    });
    dispose();
  });

  test('requireFeatures without a featureChecker fails closed', () => {
    setIsSignedIn(true);
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const { result, dispose } = guard({ requireFeatures: ['pro'] });
      expect(result.isUnauthorized()).toBe(true);
      dispose();
    } finally {
      console.warn = originalWarn;
    }
  });

  test('access is revoked when the user signs out', () => {
    setIsSignedIn(true);
    const { result, dispose } = guard();
    expect(result.isAuthorized()).toBe(true);
    setIsSignedIn(false);
    expect(result.isUnauthorized()).toBe(true);
    expect(navigations).toHaveLength(1);
    dispose();
  });
});

describe('useAuthNavigation', () => {
  function nav() {
    return createRoot(dispose => ({ result: useAuthNavigation(), dispose }));
  }

  test('navigateWithAuth sends signed-out users to sign-in', () => {
    const { result, dispose } = nav();
    result.navigateWithAuth('/billing', true);
    expect(navigations).toEqual(['/sign-in?redirectTo=%2Fbilling']);
    dispose();
  });

  test('redirectAfterAuth follows an app-relative redirectTo', () => {
    locationSearch = '?redirectTo=%2Fadmin%3Ftab%3D1';
    const { result, dispose } = nav();
    result.redirectAfterAuth();
    expect(navigations).toEqual(['/admin?tab=1']);
    dispose();
  });

  test.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ])('redirectAfterAuth refuses open redirect to %s', target => {
    locationSearch = `?redirectTo=${encodeURIComponent(target)}`;
    const { result, dispose } = nav();
    result.redirectAfterAuth('/home');
    expect(navigations).toEqual(['/home']);
    dispose();
  });
});
