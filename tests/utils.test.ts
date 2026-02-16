import { test, expect, describe } from 'bun:test';
import { isFunction, safeAuthAccess } from '../src/utils';

describe('isFunction', () => {
  test('returns true for functions', () => {
    expect(isFunction(() => 'hello')).toBe(true);
  });

  test('returns false for non-functions', () => {
    expect(isFunction('hello')).toBe(false);
    expect(isFunction(42)).toBe(false);
    expect(isFunction(true)).toBe(false);
    expect(isFunction(null)).toBe(false);
    expect(isFunction(undefined)).toBe(false);
  });
});

describe('safeAuthAccess', () => {
  test('unwraps function values (Accessors)', () => {
    const accessor = () => 'value';
    expect(safeAuthAccess(accessor)).toBe('value');
  });

  test('returns raw values directly', () => {
    expect(safeAuthAccess('raw')).toBe('raw');
    expect(safeAuthAccess(42)).toBe(42);
    expect(safeAuthAccess(true)).toBe(true);
  });

  test('handles boolean accessor (Clerk isLoaded pattern)', () => {
    const isLoaded = () => true;
    expect(safeAuthAccess(isLoaded)).toBe(true);
  });

  test('handles raw boolean (Clerk isLoaded pattern)', () => {
    expect(safeAuthAccess(true)).toBe(true);
    expect(safeAuthAccess(false)).toBe(false);
  });
});
