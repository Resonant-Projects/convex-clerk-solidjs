import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server';
import { useConvexClient } from './provider';

/**
 * Create a mutation caller bound to the current Convex client.
 *
 * @param mutation - A Convex mutation function reference
 * @returns An async function that invokes the mutation with the given args
 */
export function createMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation,
): (args?: FunctionArgs<Mutation>) => Promise<FunctionReturnType<Mutation>> {
  const convex = useConvexClient();

  return async (args?: FunctionArgs<Mutation>) => {
    const fullArgs = args ?? {};
    return convex.mutation(mutation, fullArgs) as Promise<FunctionReturnType<Mutation>>;
  };
}
