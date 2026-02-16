# Changelog

## 0.1.0

Initial release.

- `ConvexProviderWithClerk` — SolidJS provider that bridges Clerk auth with Convex
- `useConvexClient` — access the Convex client from context
- `useConvexAuth` — reactive auth state (isLoading, isAuthenticated)
- `createQuery` — reactive query subscription via SolidJS `from()`
- `createQueryWithStatus` — query with data/error/isLoading/isError signals
- `createMutation` — mutation caller bound to Convex client
- `createAction` — action caller bound to Convex client
- `useAuthGuard` — configurable auth/role/permission/feature guard (guards sub-module)
- `useAuthNavigation` — auth-aware navigation helpers (guards sub-module)
- `FeatureChecker` — generic callback interface for custom feature gating
- Convenience hooks: `useRequireAuth`, `useRequireRole`, `useRequirePermission`, `useRequireFeature`
