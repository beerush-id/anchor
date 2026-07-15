// biome-ignore lint/suspicious/noExplicitAny: Expected any
export const $ROOT = globalThis as any;

export function $symbol(name: string, suffix?: string) {
  if (suffix) return Symbol.for(`--anchor-${name}-${suffix}`);
  return Symbol.for(`--anchor-${name}`);
}

/**
 * Check if the current environment is a browser.
 * @returns {boolean}
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
