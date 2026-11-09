// Minimal typing for the one @babel/core API the test preload uses.
declare module '@babel/core' {
  export function transformAsync(
    code: string,
    options: Record<string, unknown>,
  ): Promise<{ code?: string | null } | null>;
}
