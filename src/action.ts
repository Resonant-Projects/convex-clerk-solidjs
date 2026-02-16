import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server';
import { useConvexClient } from './provider';

/**
 * Create an action caller bound to the current Convex client.
 *
 * @param action - A Convex action function reference
 * @returns An async function that invokes the action with the given args
 */
export function createAction<Action extends FunctionReference<'action'>>(
  action: Action,
): (args?: FunctionArgs<Action>) => Promise<FunctionReturnType<Action>> {
  const convex = useConvexClient();

  return async (args?: FunctionArgs<Action>) => {
    const fullArgs = args ?? {};
    return convex.action(action, fullArgs) as Promise<FunctionReturnType<Action>>;
  };
}
