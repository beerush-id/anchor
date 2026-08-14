import { parse } from 'yaml';

/**
 * Extracts YAML frontmatter bounded by --- markers into a JavaScript object.
 */
export function getFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  try {
    return parse(match[1]) as Record<string, unknown>;
  } catch {
    return {};
  }
}
