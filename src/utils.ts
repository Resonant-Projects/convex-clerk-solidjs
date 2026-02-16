/**
 * Type guard to check if a value is a function (i.e., a SolidJS Accessor).
 */
export function isFunction<T>(value: T | (() => T)): value is () => T {
  return typeof value === 'function';
}

/**
 * Safely unwraps a value that may be either a raw value or a SolidJS Accessor.
 * Clerk-solidjs may return either depending on version and context.
 */
export function safeAuthAccess<T>(value: T | (() => T)): T {
  return isFunction(value) ? value() : value;
}
