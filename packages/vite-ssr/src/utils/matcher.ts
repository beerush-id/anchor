/**
 * A file pattern: plain strings match by suffix (after stripping the query
 * suffix), regular expressions are tested against the clean id.
 */
export type FilePattern = string | RegExp;

/**
 * Creates a predicate matching Vite module ids against `include`/`exclude`
 * patterns. The query suffix (`?chunk`, ...) is stripped before matching so
 * patterns never need to account for it.
 *
 * - `string` patterns match by suffix: `'.mdx'` matches `src/pages/page.mdx`.
 * - `RegExp` patterns are tested as-is: `/\.mdx$/`.
 */
export function createMatcher(include: FilePattern[] = [], exclude: FilePattern[] = []) {
  const test = (pattern: FilePattern, id: string): boolean => {
    if (typeof pattern === 'string') return id.endsWith(pattern);
    pattern.lastIndex = 0;
    return pattern.test(id);
  };

  return (id: string): boolean => {
    const clean = id.split('?')[0];
    return include.some((p) => test(p, clean)) && !exclude.some((p) => test(p, clean));
  };
}
