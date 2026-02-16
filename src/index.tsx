// Provider
export { ConvexProviderWithClerk } from './provider';
export type { ConvexProviderWithClerkProps } from './provider';

// Client access
export { useConvexClient } from './client';

// Auth state
export { useConvexAuth } from './auth';

// Reactive data hooks
export { createQuery, createQueryWithStatus } from './query';
export type { QueryStatus } from './query';
export { createMutation } from './mutation';
export { createAction } from './action';

// Types
export type {
  AuthTokenFetcher,
  UseClerkAuth,
  ClerkAuth,
  ConvexAuthState,
  IConvexClient,
} from './types';

// Utilities
export { safeAuthAccess, isFunction } from './utils';
