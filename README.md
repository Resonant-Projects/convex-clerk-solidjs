# convex-clerk-solidjs

[![npm version](https://img.shields.io/npm/v/convex-clerk-solidjs)](https://www.npmjs.com/package/convex-clerk-solidjs)
[![license](https://img.shields.io/npm/l/convex-clerk-solidjs)](https://github.com/keithce/convex-clerk-solidjs/blob/main/LICENSE)

Clerk authentication integration for [Convex](https://convex.dev) in [SolidJS](https://www.solidjs.com/) applications. Provides a reactive provider, type-safe data hooks, and configurable route guards with support for roles, permissions, and custom feature gating.

## Installation

```bash
bun add convex-clerk-solidjs
```

### Peer Dependencies

```bash
bun add solid-js convex clerk-solidjs
```

For route guards, you also need `@solidjs/router` (optional):

```bash
bun add @solidjs/router
```

| Package | Version |
|---------|---------|
| `solid-js` | >= 1.6.0 |
| `convex` | >= 1.25.0 |
| `clerk-solidjs` | >= 2.0.0 |
| `@solidjs/router` | >= 0.14.0 (optional, for guards) |

## Quick Start

```tsx
import { ConvexClient } from "convex/browser";
import { ClerkProvider, useAuth } from "clerk-solidjs";
import { ConvexProviderWithClerk, createQuery } from "convex-clerk-solidjs";
import { api } from "../convex/_generated/api";

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TaskList />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function TaskList() {
  const tasks = createQuery(api.tasks.list);
  return <For each={tasks()}>{(task) => <div>{task.text}</div>}</For>;
}
```

## Clerk Dashboard Setup

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com/).
2. Navigate to **JWT Templates**.
3. Create a new template named **`convex`**.
4. Use Clerk's Convex template or configure it with the following claims:

```json
{
  "aud": "convex",
  "iss": "https://your-clerk-domain.clerk.accounts.dev",
  "sub": "{{user.id}}"
}
```

The template name **must** be `convex` -- the provider requests tokens with `template: 'convex'` internally.

## Convex Dashboard Setup

1. In your [Convex Dashboard](https://dashboard.convex.dev/), go to **Settings > Authentication**.
2. Add Clerk as an auth provider.
3. Create an `auth.config.ts` in your `convex/` directory:

```ts
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

Replace the `domain` with your Clerk Frontend API URL found in Clerk Dashboard > **API Keys**.

## Provider Setup

`ConvexProviderWithClerk` bridges Clerk authentication with the Convex client. It uses an adapter pattern -- you pass Clerk's `useAuth` hook directly, and the provider handles token fetching, refresh, and cleanup.

```tsx
import { ConvexClient } from "convex/browser";
import { ClerkProvider, useAuth } from "clerk-solidjs";
import { ConvexProviderWithClerk } from "convex-clerk-solidjs";

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {/* Your app goes here */}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `client` | `ConvexClient` | A Convex browser client instance |
| `useAuth` | `UseClerkAuth` | Clerk's `useAuth` hook (passed as a reference, not called) |
| `children` | `JSX.Element` | Child components that can access Convex and auth state |

The provider automatically:
- Fetches JWT tokens using the `convex` template
- Refreshes tokens when Clerk's auth state changes
- Handles organization switching (orgId/orgRole changes)
- Clears auth state on sign-out
- Cleans up on unmount

## Data Hooks

### createQuery

Subscribe to a Convex query with a reactive SolidJS accessor. Automatically updates when server data changes.

```tsx
import { createQuery } from "convex-clerk-solidjs";
import { api } from "../convex/_generated/api";

function Messages() {
  const messages = createQuery(api.messages.list);

  return (
    <Show when={messages()} fallback={<div>Loading...</div>}>
      <For each={messages()}>
        {(msg) => <p>{msg.text}</p>}
      </For>
    </Show>
  );
}
```

With arguments:

```tsx
const message = createQuery(api.messages.getById, { id: messageId });
```

With reactive (dynamic) arguments:

```tsx
const messages = createQuery(api.messages.search, () => ({ query: searchTerm() }));
```

### createQueryWithStatus

Like `createQuery`, but returns a status object with `data`, `error`, `isLoading`, and `isError` accessors. Useful when you need to distinguish between loading and error states.

```tsx
import { createQueryWithStatus } from "convex-clerk-solidjs";
import { api } from "../convex/_generated/api";

function UserProfile() {
  const { data, error, isLoading, isError } = createQueryWithStatus(
    api.users.getCurrent
  );

  return (
    <Switch>
      <Match when={isLoading()}>
        <Spinner />
      </Match>
      <Match when={isError()}>
        <ErrorBanner message={error()!.message} />
      </Match>
      <Match when={data()}>
        <ProfileCard user={data()!} />
      </Match>
    </Switch>
  );
}
```

#### QueryStatus Return Type

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Accessor<T \| undefined>` | The query result, or `undefined` while loading |
| `error` | `Accessor<Error \| null>` | The error if the query failed, or `null` |
| `isLoading` | `Accessor<boolean>` | `true` while waiting for data and no error has occurred |
| `isError` | `Accessor<boolean>` | `true` if the query encountered an error |

### createMutation

Create a mutation caller bound to the current Convex client. Returns an async function.

```tsx
import { createMutation } from "convex-clerk-solidjs";
import { api } from "../convex/_generated/api";

function SendMessage() {
  const sendMessage = createMutation(api.messages.send);

  const handleSubmit = async (text: string) => {
    await sendMessage({ text, author: "Alice" });
  };

  return <button onClick={() => handleSubmit("Hello!")}>Send</button>;
}
```

### createAction

Create an action caller bound to the current Convex client. Works the same way as `createMutation` but for Convex actions (which can have side effects, call third-party APIs, etc.).

```tsx
import { createAction } from "convex-clerk-solidjs";
import { api } from "../convex/_generated/api";

function GenerateSummary() {
  const summarize = createAction(api.ai.summarize);

  const handleClick = async () => {
    const summary = await summarize({ documentId: "abc123" });
    console.log(summary);
  };

  return <button onClick={handleClick}>Summarize</button>;
}
```

## Auth Hooks

### useConvexAuth

Returns the current Convex authentication state. Useful for conditionally rendering UI based on whether the user is authenticated with the Convex backend (not just Clerk).

```tsx
import { useConvexAuth } from "convex-clerk-solidjs";

function AuthStatus() {
  const auth = useConvexAuth();

  return (
    <Switch>
      <Match when={auth.isLoading}>
        <p>Connecting...</p>
      </Match>
      <Match when={auth.isAuthenticated}>
        <p>Authenticated with Convex</p>
      </Match>
      <Match when={!auth.isAuthenticated}>
        <p>Not authenticated</p>
      </Match>
    </Switch>
  );
}
```

| Property | Type | Description |
|----------|------|-------------|
| `isLoading` | `boolean` | `true` while Convex is validating the auth token |
| `isAuthenticated` | `boolean` | `true` when the Convex backend has confirmed authentication |

### useConvexClient

Returns the underlying `ConvexClient` instance for advanced use cases.

```tsx
import { useConvexClient } from "convex-clerk-solidjs";

function Advanced() {
  const client = useConvexClient();

  // Direct client access for advanced operations
  const result = await client.query(api.messages.list, {});
}
```

## Route Guards

Route guards require `@solidjs/router` as a peer dependency. Import them from the `/guards` subpath:

```tsx
import { useAuthGuard } from "convex-clerk-solidjs/guards";
```

### useAuthGuard

The primary guard hook. Checks authentication, Clerk organization roles, Clerk permissions, and custom feature access. Automatically redirects unauthorized users.

```tsx
import { useAuthGuard } from "convex-clerk-solidjs/guards";

function AdminDashboard() {
  const { isLoading, isAuthorized } = useAuthGuard({
    requireAuth: true,
    requireRoles: ["org:admin"],
    redirectTo: "/sign-in",
    onUnauthorized: (reason) => console.log("Blocked:", reason),
  });

  return (
    <Show when={!isLoading()} fallback={<Spinner />}>
      <Show when={isAuthorized()} fallback={<p>Access denied</p>}>
        <AdminPanel />
      </Show>
    </Show>
  );
}
```

### AuthGuardConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireAuth` | `boolean` | `true` | Whether authentication is required |
| `requireRoles` | `string[]` | `[]` | Clerk organization roles to check (e.g., `["org:admin"]`) |
| `requirePermissions` | `string[]` | `[]` | Clerk permissions to check (e.g., `["org:billing:manage"]`) |
| `requireFeatures` | `string[]` | `[]` | Feature keys to check via `featureChecker` |
| `featureChecker` | `FeatureChecker` | `undefined` | Custom function to check feature access (required if `requireFeatures` is set) |
| `redirectTo` | `string` | `"/sign-in"` | Path to redirect to when unauthorized |
| `fallback` | `() => JSX.Element` | `undefined` | Component to render while loading |
| `onUnauthorized` | `(reason: string) => void` | `undefined` | Callback when authorization fails |

### AuthGuardResult

| Property | Type | Description |
|----------|------|-------------|
| `isLoading` | `() => boolean` | `true` while auth or feature checks are in progress |
| `isAuthorized` | `() => boolean` | `true` when all checks pass |
| `isUnauthorized` | `() => boolean` | `true` when any check fails |
| `authorizationStatus` | `() => AuthorizationStatus` | Full status object with `status` and `reason` |

### Convenience Hooks

```tsx
import {
  useRequireAuth,
  useRequireRole,
  useRequirePermission,
  useRequireFeature,
} from "convex-clerk-solidjs/guards";

// Simple authentication requirement
const guard = useRequireAuth("/sign-in");

// Require a specific Clerk organization role
const guard = useRequireRole("org:admin", "/unauthorized");

// Require a specific Clerk permission
const guard = useRequirePermission("org:billing:manage", "/unauthorized");

// Require a custom feature (see FeatureChecker below)
const guard = useRequireFeature("premium", checkFeature, "/upgrade");
```

### FeatureChecker Pattern

The `FeatureChecker` type lets you plug in any feature gating backend (Stripe, LaunchDarkly, PostHog, etc.). Implement a function that takes feature keys and returns an access result.

```ts
type FeatureChecker = (requiredFeatures: string[]) => FeatureCheckResult;

interface FeatureCheckResult {
  isLoading: boolean;
  hasAccess: boolean;
  reason?: string;
}
```

#### Stripe Example

```tsx
import { createQuery } from "convex-clerk-solidjs";
import { useAuthGuard } from "convex-clerk-solidjs/guards";
import type { FeatureChecker } from "convex-clerk-solidjs/guards";
import { api } from "../convex/_generated/api";

function PremiumPage() {
  const subscription = createQuery(api.subscriptions.getCurrent);

  const checkStripeFeature: FeatureChecker = (requiredFeatures) => {
    const sub = subscription();

    if (!sub) {
      return { isLoading: true, hasAccess: false };
    }

    const planFeatures = sub.features ?? [];
    const hasAccess = requiredFeatures.every((f) => planFeatures.includes(f));

    return {
      isLoading: false,
      hasAccess,
      reason: hasAccess ? undefined : `Upgrade to access: ${requiredFeatures.join(", ")}`,
    };
  };

  const { isLoading, isAuthorized } = useAuthGuard({
    requireFeatures: ["analytics", "export"],
    featureChecker: checkStripeFeature,
    redirectTo: "/upgrade",
  });

  return (
    <Show when={!isLoading()} fallback={<Spinner />}>
      <Show when={isAuthorized()}>
        <PremiumDashboard />
      </Show>
    </Show>
  );
}
```

### useAuthNavigation

Auth-aware navigation helpers for handling redirects around sign-in flows.

```tsx
import { useAuthNavigation } from "convex-clerk-solidjs/guards";

function Navigation() {
  const { navigateWithAuth, redirectAfterAuth, isAuthenticated } =
    useAuthNavigation();

  return (
    <nav>
      <button onClick={() => navigateWithAuth("/dashboard", true)}>
        Dashboard
      </button>
    </nav>
  );
}

// After sign-in, redirect to the original page (or /dashboard as fallback)
function PostSignIn() {
  const { redirectAfterAuth } = useAuthNavigation();

  onMount(() => {
    redirectAfterAuth("/dashboard");
  });

  return <p>Signing you in...</p>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `navigateWithAuth` | `(path: string, requireAuth?: boolean) => void` | Navigates to `path`. If `requireAuth` is `true` and user is not signed in, redirects to `/sign-in?redirectTo=<path>` instead. |
| `redirectAfterAuth` | `(fallbackPath?: string) => void` | Reads `redirectTo` from the URL query string and navigates there. Falls back to `fallbackPath` (default `"/dashboard"`). |
| `isAuthenticated` | `Accessor<boolean \| undefined>` | Clerk's `isSignedIn` signal. |

## API Reference

### Main Exports (`convex-clerk-solidjs`)

| Export | Kind | Description |
|--------|------|-------------|
| `ConvexProviderWithClerk` | Component | Provider that bridges Clerk auth with Convex |
| `useConvexClient` | Hook | Returns the `ConvexClient` instance |
| `useConvexAuth` | Hook | Returns `{ isLoading, isAuthenticated }` |
| `createQuery` | Hook | `<Query>(query, args?) => Accessor<T \| undefined>` |
| `createQueryWithStatus` | Hook | `<Query>(query, args?) => QueryStatus<T>` |
| `createMutation` | Hook | `<Mutation>(mutation) => (args?) => Promise<T>` |
| `createAction` | Hook | `<Action>(action) => (args?) => Promise<T>` |
| `safeAuthAccess` | Utility | Unwraps a value that may be a raw value or a SolidJS Accessor |
| `isFunction` | Utility | Type guard to check if a value is a function |

### Type Exports (`convex-clerk-solidjs`)

| Type | Description |
|------|-------------|
| `ConvexProviderWithClerkProps` | Props for the provider component |
| `QueryStatus<T>` | Return type of `createQueryWithStatus` |
| `AuthTokenFetcher` | Token fetcher function signature |
| `UseClerkAuth` | Type for the `useAuth` hook parameter |
| `ClerkAuth` | Clerk auth object shape (subset used by the provider) |
| `ConvexAuthState` | `{ isLoading: boolean; isAuthenticated: boolean }` |
| `IConvexClient` | Minimal duck-typed interface for the Convex client |

### Guard Exports (`convex-clerk-solidjs/guards`)

| Export | Kind | Description |
|--------|------|-------------|
| `useAuthGuard` | Hook | `(config?) => AuthGuardResult` |
| `useRequireAuth` | Hook | `(redirectTo?) => AuthGuardResult` |
| `useRequireRole` | Hook | `(role, redirectTo?) => AuthGuardResult` |
| `useRequirePermission` | Hook | `(permission, redirectTo?) => AuthGuardResult` |
| `useRequireFeature` | Hook | `(feature, featureChecker, redirectTo?) => AuthGuardResult` |
| `useAuthNavigation` | Hook | Returns `{ navigateWithAuth, redirectAfterAuth, isAuthenticated }` |

### Guard Type Exports (`convex-clerk-solidjs/guards`)

| Type | Description |
|------|-------------|
| `AuthGuardConfig` | Full configuration object for `useAuthGuard` |
| `AuthGuardResult` | Return type of all guard hooks |
| `AuthorizationStatus` | Union: `{ status: 'loading' \| 'authorized' \| 'unauthorized'; reason: string }` |
| `FeatureChecker` | `(requiredFeatures: string[]) => FeatureCheckResult` |
| `FeatureCheckResult` | `{ isLoading: boolean; hasAccess: boolean; reason?: string }` |

## Credits

This library builds on the work of several community projects:

- [clerk-solidjs](https://github.com/nicknisi/clerk-solidjs) by spirit-led-software -- Clerk SDK for SolidJS
- [convex-solidjs](https://github.com/nicknisi/convex-solidjs) by Frank-III -- Convex client bindings for SolidJS
- [vedic-astro-made-easy](https://github.com/keithce/vedic-astro-made-easy) -- Production app that inspired this library

## License

[MIT](./LICENSE)
