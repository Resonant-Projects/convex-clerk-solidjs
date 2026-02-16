import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server';
import { from, createSignal, createMemo, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useConvexClient } from './provider';

/**
 * Result type for createQueryWithStatus — provides data, error, and loading states.
 */
export interface QueryStatus<T> {
  data: Accessor<T | undefined>;
  error: Accessor<Error | null>;
  isLoading: Accessor<boolean>;
  isError: Accessor<boolean>;
}

/**
 * Create a reactive SolidJS accessor subscribed to a Convex query.
 * Automatically updates when query results change.
 *
 * @param query - A Convex query function reference
 * @param args - Arguments for the query (reactive — wrap in a getter for dynamic args)
 * @returns An accessor that returns the query result, or undefined while loading
 */
export function createQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args?: FunctionArgs<Query> | (() => FunctionArgs<Query>),
): Accessor<FunctionReturnType<Query> | undefined> {
  const convex = useConvexClient();
  const resolvedArgs = typeof args === 'function' ? (args as () => FunctionArgs<Query>)() : (args ?? {});

  return from<FunctionReturnType<Query>>(setter => {
    const unsubscribe = convex.onUpdate(query, resolvedArgs, setter);
    return unsubscribe;
  });
}

/**
 * Create a reactive SolidJS query with full status tracking including error state.
 * Unlike createQuery, this variant exposes error state so callers can distinguish
 * between loading and failed queries.
 *
 * @param query - A Convex query function reference
 * @param args - Arguments for the query
 * @returns Object with data, error, isLoading, isError accessors
 */
export function createQueryWithStatus<Query extends FunctionReference<'query'>>(
  query: Query,
  args?: FunctionArgs<Query> | (() => FunctionArgs<Query>),
): QueryStatus<FunctionReturnType<Query>> {
  const convex = useConvexClient();
  const resolvedArgs = typeof args === 'function' ? (args as () => FunctionArgs<Query>)() : (args ?? {});

  const [data, setData] = createSignal<FunctionReturnType<Query> | undefined>(undefined);
  const [error, setError] = createSignal<Error | null>(null);

  let hasReceivedData = false;
  let isMounted = true;

  // Subscribe to live updates
  const unsubscribe = convex.onUpdate(
    query,
    resolvedArgs,
    (result: FunctionReturnType<Query>) => {
      hasReceivedData = true;
      setData(() => result);
      setError(() => null);
    },
    (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMounted) {
        setError(() => error);
      }
    },
  );

  onCleanup(() => {
    isMounted = false;
    unsubscribe();
  });

  // One-time query to catch initial results or errors
  convex
    .query(query, resolvedArgs)
    .then((result: FunctionReturnType<Query>) => {
      if (!hasReceivedData && isMounted) {
        hasReceivedData = true;
        setData(() => result);
      }
    })
    .catch((err: unknown) => {
      if (!hasReceivedData && isMounted) {
        setError(() => (err instanceof Error ? err : new Error(String(err))));
      }
    });

  const isLoading = createMemo(() => data() === undefined && error() === null);
  const isError = createMemo(() => error() !== null);

  return { data, error, isLoading, isError };
}
