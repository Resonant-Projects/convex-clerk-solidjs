import { test, expect, describe } from 'bun:test';
import { createMockConvexClient, createMockClerkAuth } from './helpers';

describe('mock helpers', () => {
  test('createMockConvexClient tracks setAuth calls', () => {
    const { client, calls } = createMockConvexClient();
    const fetchToken = async () => 'token';
    const onChange = () => {};

    client.setAuth(fetchToken, onChange);

    expect(calls.setAuth).toHaveLength(1);
    expect(calls.setAuth[0]!.fetchToken).toBe(fetchToken);
  });

  test('createMockConvexClient tracks mutation calls', async () => {
    const { client, calls } = createMockConvexClient();
    const ref = { name: 'test:mutation' };

    const result = await client.mutation(ref, { arg: 1 });

    expect(calls.mutation).toHaveLength(1);
    expect(calls.mutation[0]!.args).toEqual({ arg: 1 });
    expect(result).toEqual({ success: true });
  });

  test('createMockConvexClient tracks action calls', async () => {
    const { client, calls } = createMockConvexClient();
    const ref = { name: 'test:action' };

    const result = await client.action(ref, { arg: 2 });

    expect(calls.action).toHaveLength(1);
    expect(result).toEqual({ result: 'ok' });
  });

  test('createMockClerkAuth provides defaults', () => {
    const auth = createMockClerkAuth();

    expect(auth.isLoaded).toBe(true);
    expect(auth.isSignedIn).toBe(false);
    expect(auth.orgId).toBeNull();
  });

  test('createMockClerkAuth accepts overrides', () => {
    const auth = createMockClerkAuth({ isSignedIn: true, orgId: 'org_123' });

    expect(auth.isSignedIn).toBe(true);
    expect(auth.orgId).toBe('org_123');
  });

  test('createMockConvexClient onUpdate returns unsubscribe function', () => {
    const { client } = createMockConvexClient();
    const unsub = client.onUpdate({}, {}, () => {});

    expect(typeof unsub).toBe('function');
  });
});
