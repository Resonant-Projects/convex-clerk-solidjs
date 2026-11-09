// Provider
export { ConvexProviderWithClerk } from './provider.js';
export type { ConvexProviderWithClerkProps } from './provider.js';

// Client access
export { useConvexClient } from './client.js';

// Auth state
export { useConvexAuth } from './auth.js';

// Reactive data hooks
export { createQuery, createQueryWithStatus } from './query.js';
export type { QueryStatus } from './query.js';
export { createMutation } from './mutation.js';
export { createAction } from './action.js';

// Types
export type {
  AuthTokenFetcher,
  UseClerkAuth,
  ClerkAuth,
  ConvexAuthState,
  IConvexClient,
} from './types.js';

// Utilities
export { safeAuthAccess, isFunction } from './utils.js';
