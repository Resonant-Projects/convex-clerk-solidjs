import { test, expect, describe } from 'bun:test';
// Import types directly from the types file to avoid triggering @solidjs/router import
import type { AuthGuardConfig, FeatureChecker, AuthGuardResult } from '../src/guards/types';

describe('guards module structure', () => {
  test('guard hooks are defined in useAuthGuard module', async () => {
    const src = await Bun.file('./src/guards/useAuthGuard.ts').text();
    expect(src).toContain('export function useAuthGuard');
    expect(src).toContain('export function useRequireAuth');
    expect(src).toContain('export function useRequireRole');
    expect(src).toContain('export function useRequirePermission');
    expect(src).toContain('export function useRequireFeature');
  });

  test('useAuthNavigation is defined in its own module', async () => {
    const src = await Bun.file('./src/guards/useAuthNavigation.ts').text();
    expect(src).toContain('export function useAuthNavigation');
    expect(src).toContain('navigateWithAuth');
    expect(src).toContain('redirectAfterAuth');
  });
});

describe('FeatureChecker type', () => {
  test('FeatureChecker is a callable type', () => {
    const checker: FeatureChecker = (features: string[]) => ({
      isLoading: false,
      hasAccess: features.includes('basic'),
      reason: undefined,
    });

    const result = checker(['basic', 'pro']);
    expect(result.hasAccess).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  test('FeatureChecker can deny access with reason', () => {
    const checker: FeatureChecker = (features: string[]) => ({
      isLoading: false,
      hasAccess: false,
      reason: `Missing: ${features.join(', ')}`,
    });

    const result = checker(['pro_charts']);
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('Missing: pro_charts');
  });

  test('FeatureChecker can report loading state', () => {
    const checker: FeatureChecker = () => ({
      isLoading: true,
      hasAccess: false,
    });

    const result = checker(['any']);
    expect(result.isLoading).toBe(true);
  });
});

describe('AuthGuardConfig type', () => {
  test('AuthGuardConfig accepts all optional fields', () => {
    const config: AuthGuardConfig = {
      requireAuth: true,
      requireRoles: ['admin'],
      requirePermissions: ['read:data'],
      requireFeatures: ['pro_chart'],
      featureChecker: () => ({ isLoading: false, hasAccess: true }),
      redirectTo: '/login',
      onUnauthorized: (reason) => console.log(reason),
    };

    expect(config.requireAuth).toBe(true);
    expect(config.requireRoles).toEqual(['admin']);
    expect(config.requireFeatures).toEqual(['pro_chart']);
  });

  test('AuthGuardConfig works with empty config', () => {
    const config: AuthGuardConfig = {};
    expect(config.requireAuth).toBeUndefined();
  });
});
