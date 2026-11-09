/**
 * Return `candidate` only when it is a same-origin, app-relative path
 * (`/dashboard?tab=1`); otherwise return `fallback`. Blocks open redirects via
 * absolute URLs (`https://evil.example`), protocol-relative URLs
 * (`//evil.example`), backslash variants (`/\evil.example`), and other schemes
 * (`javascript:`), since a post-auth redirect target usually comes from the
 * query string.
 *
 * @param candidate - The requested redirect target, e.g. a `redirectTo` param
 * @param fallback - The path to use when `candidate` is missing or unsafe
 * @returns A safe app-relative path
 */
export function toSafeRedirectPath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (!candidate) return fallback;
  // Reject control characters and whitespace that browsers strip or normalize.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control-character check
  if (/[\u0000-\u001f\u007f\s]/.test(candidate)) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return fallback;
  }
  return candidate;
}
