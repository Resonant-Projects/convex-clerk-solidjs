# Changelog

## Unreleased

### Breaking

- Clerk peer dependency is now `@resonant-projects/clerk-solidjs` `^4.3.6` (replaces `clerk-solidjs`), which pulls the patched `@clerk/shared` 4.44.x (GHSA-vqx2-fgx2-5wq9 / CVE-2026-41248). Update imports of `ClerkProvider`/`useAuth`.
- Peer ranges: `solid-js` `^1.9.8`; optional `@solidjs/router` `>=0.16 <2`.
- Type declarations moved to `dist/types/` (resolved through `exports`).

### Fixed

- `useConvexAuth()` now updates reactively; it previously stayed at its initial `isLoading: true` state.
- A rejected Clerk `getToken()` now fails closed (`null` token) instead of escaping to Convex.
- `ClerkAuth.orgId`/`orgRole` accept Clerk's `Accessor<string | null | undefined>`, so `useAuth` from `@resonant-projects/clerk-solidjs` type-checks as the `useAuth` prop.
- `redirectAfterAuth` ignores non-app-relative `redirectTo` values (open-redirect hardening).

### Changed

- `ConvexProviderWithClerk` throws at mount when `client` or `useAuth` is missing or invalid.
- Guards use Clerk's typed `has()` instead of an `any` cast.

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
