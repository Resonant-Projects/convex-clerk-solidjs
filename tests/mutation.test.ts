import { test, expect, describe } from 'bun:test';
import { createRoot } from 'solid-js';
import type { FunctionReference } from 'convex/server';

describe('createMutation', () => {
  test('module exports createMutation function', async () => {
    const mod = await import('../src/mutation');
    expect(typeof mod.createMutation).toBe('function');
  });

  test('createMutation throws outside provider', () => {
    createRoot(dispose => {
      const { createMutation } = require('../src/mutation');
      const mockRef = { _type: 'mutation' } as unknown as FunctionReference<'mutation'>;

      expect(() => createMutation(mockRef)).toThrow();
      dispose();
    });
  });
});
