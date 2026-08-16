import { parse } from 'yaml';

const FRONTMATTER = /^\s*---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Returns the YAML frontmatter block of `content` (fences excluded), or
 * `undefined` when the file has none.
 *
 * @param content Source text, possibly starting with fenced frontmatter.
 */
export function matchFrontmatter(content: string): string | undefined {
  return content.match(FRONTMATTER)?.[1];
}

/**
 * Parses a YAML frontmatter block (fences excluded) into a JavaScript object.
 *
 * @param block The block returned by `matchFrontmatter`.
 * @returns The parsed object, or `{}` when the block is empty or invalid.
 */
export function parseFrontmatterBlock(block: string): Record<string, unknown> {
  if (!block) return {};

  try {
    return parse(block) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Removes the frontmatter block from the source, leaving only the content
 * body for the compiler. Shares the regex with `matchFrontmatter` so both
 * consumers agree on the same block.
 *
 * @param content Full source text, possibly starting with fenced frontmatter.
 * @returns The source without the frontmatter block.
 */
export function stripFrontmatter(content: string): string {
  const match = content.match(FRONTMATTER);
  return match ? content.slice(match[0].length) : content;
}
