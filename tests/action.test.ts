import { test, expect, describe } from 'bun:test';
import { createRoot } from 'solid-js';
import type { FunctionReference } from 'convex/server';

describe('createAction', () => {
  test('module exports createAction function', async () => {
    const mod = await import('../src/action');
    expect(typeof mod.createAction).toBe('function');
  });

  test('createAction throws outside provider', () => {
    createRoot(dispose => {
      const { createAction } = require('../src/action');
      const mockRef = { _type: 'action' } as unknown as FunctionReference<'action'>;

      expect(() => createAction(mockRef)).toThrow();
      dispose();
    });
  });
});
