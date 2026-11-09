import { describe, expect, test } from 'bun:test';
import { toSafeRedirectPath } from '../src/guards/redirect.js';

describe('toSafeRedirectPath', () => {
  test.each(['/', '/dashboard', '/admin?tab=1#top', '/a/b/c'])(
    'keeps app-relative path %s',
    path => {
      expect(toSafeRedirectPath(path, '/fallback')).toBe(path);
    },
  );

  test.each([
    null,
    undefined,
    '',
    'dashboard',
    'https://evil.example',
    'http://evil.example/path',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/\tjavascript:alert(1)',
    ' /dashboard',
    '/dash\nboard',
  ])('falls back for %p', candidate => {
    expect(toSafeRedirectPath(candidate, '/fallback')).toBe('/fallback');
  });
});
