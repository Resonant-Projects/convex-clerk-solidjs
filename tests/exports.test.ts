import { test, expect, describe } from 'bun:test';

describe('main entry exports', () => {
  test('exports all expected symbols', async () => {
    const mod = await import('../src/index');

    // Provider
    expect(typeof mod.ConvexProviderWithClerk).toBe('function');

    // Client/auth hooks
    expect(typeof mod.useConvexClient).toBe('function');
    expect(typeof mod.useConvexAuth).toBe('function');

    // Data hooks
    expect(typeof mod.createQuery).toBe('function');
    expect(typeof mod.createQueryWithStatus).toBe('function');
    expect(typeof mod.createMutation).toBe('function');
    expect(typeof mod.createAction).toBe('function');

    // Utilities
    expect(typeof mod.safeAuthAccess).toBe('function');
    expect(typeof mod.isFunction).toBe('function');
  });

  test('does not export router-dependent code', async () => {
    const mod = await import('../src/index');
    // Guards should NOT be in the main export
    expect((mod as any).useAuthGuard).toBeUndefined();
    expect((mod as any).useAuthNavigation).toBeUndefined();
  });
});

describe('guards entry exports', () => {
  test('guard hooks are exported from useAuthGuard module', async () => {
    // Read the barrel export file to verify all exports are wired
    const src = await Bun.file('./src/guards/index.ts').text();
    expect(src).toContain('useAuthGuard');
    expect(src).toContain('useRequireAuth');
    expect(src).toContain('useRequireRole');
    expect(src).toContain('useRequirePermission');
    expect(src).toContain('useRequireFeature');
    expect(src).toContain('useAuthNavigation');
  });

  test('guard types are exported', async () => {
    const src = await Bun.file('./src/guards/index.ts').text();
    expect(src).toContain('AuthGuardConfig');
    expect(src).toContain('AuthGuardResult');
    expect(src).toContain('AuthorizationStatus');
    expect(src).toContain('FeatureChecker');
    expect(src).toContain('FeatureCheckResult');
  });
});

describe('no telemetry in source', () => {
  test('query module has no telemetry imports', async () => {
    const src = await Bun.file('./src/query.ts').text();
    expect(src).not.toContain('createSpan');
    expect(src).not.toContain('getTraceContext');
    expect(src).not.toContain('PostHog');
    expect(src).not.toContain('logErrorUnified');
  });

  test('mutation module has no telemetry imports', async () => {
    const src = await Bun.file('./src/mutation.ts').text();
    expect(src).not.toContain('createSpan');
    expect(src).not.toContain('getTraceContext');
    expect(src).not.toContain('PostHog');
    expect(src).not.toContain('logErrorUnified');
  });

  test('action module has no telemetry imports', async () => {
    const src = await Bun.file('./src/action.ts').text();
    expect(src).not.toContain('createSpan');
    expect(src).not.toContain('getTraceContext');
    expect(src).not.toContain('PostHog');
    expect(src).not.toContain('logErrorUnified');
  });
});

describe('no app-specific types in source', () => {
  test('guards have no SubscriptionTier or TIER_FEATURES', async () => {
    const src = await Bun.file('./src/guards/useAuthGuard.ts').text();
    expect(src).not.toContain('SubscriptionTier');
    expect(src).not.toContain('TIER_FEATURES');
    expect(src).not.toContain('stripeQueries');
    expect(src).not.toContain('SubscriptionStatus');
  });

  test('guards use featureChecker callback pattern', async () => {
    const src = await Bun.file('./src/guards/useAuthGuard.ts').text();
    expect(src).toContain('featureChecker');
    // FeatureChecker type is defined in guards/types.ts and imported via AuthGuardConfig
    const typesSrc = await Bun.file('./src/guards/types.ts').text();
    expect(typesSrc).toContain('FeatureChecker');
  });
});
