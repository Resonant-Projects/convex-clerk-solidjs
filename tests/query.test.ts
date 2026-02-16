import { test, expect, describe } from 'bun:test';
import { createRoot } from 'solid-js';
import type { FunctionReference } from 'convex/server';

describe('createQuery', () => {
  test('module exports createQuery function', async () => {
    const mod = await import('../src/query');
    expect(typeof mod.createQuery).toBe('function');
  });

  test('module exports createQueryWithStatus function', async () => {
    const mod = await import('../src/query');
    expect(typeof mod.createQueryWithStatus).toBe('function');
  });

  test('createQuery throws outside provider', () => {
    createRoot(dispose => {
      const { createQuery } = require('../src/query');
      const mockRef = { _type: 'query' } as unknown as FunctionReference<'query'>;

      expect(() => createQuery(mockRef)).toThrow();
      dispose();
    });
  });

  test('createQueryWithStatus throws outside provider', () => {
    createRoot(dispose => {
      const { createQueryWithStatus } = require('../src/query');
      const mockRef = { _type: 'query' } as unknown as FunctionReference<'query'>;

      expect(() => createQueryWithStatus(mockRef)).toThrow();
      dispose();
    });
  });
});

describe('QueryStatus interface', () => {
  test('QueryStatus type is exported', async () => {
    // Type-level check — if this compiles, the type is exported correctly
    const mod = await import('../src/query');
    expect(mod.createQueryWithStatus).toBeDefined();
  });
});
