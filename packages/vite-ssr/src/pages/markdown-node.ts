import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalPath, derivePrefix, GENERATED_MARKER } from './model.js';
import { writeIfChanged } from './sync.js';

/**
 * Represents a compiled MDX file and its extracted frontmatter metadata.
 * Generates an isolated TypeScript file containing the extracted frontmatter.
 */
export class MarkdownNode extends EventEmitter {
  public generatedFilePath: string;
  public itemPath: string;
  public varName: string;

  /**
   * Initializes a new markdown node.
   *
   * @param absPath Absolute path to the source MDX file.
   * @param pagesDir Absolute path to the pages root directory.
   * @param metadataDir Absolute path to the metadata generation directory.
   */
  constructor(
    public readonly absPath: string,
    pagesDir: string,
    metadataDir: string
  ) {
    super();

    const rel = path.relative(pagesDir, absPath).replace(/\\/g, '/');
    let fileName = path.basename(absPath, '.mdx');
    if (fileName !== 'page') {
      fileName = fileName.replace(/\.page$/, '');
    }
    const relDir = path.dirname(rel);
    const nodeRel = relDir === '.' ? '' : relDir;
    const relPath = nodeRel ? `${nodeRel}/${fileName}` : fileName;

    this.generatedFilePath = path.join(metadataDir, `${relPath}.ts`);

    const isPageOrLayout = fileName === 'page' || fileName === 'layout';
    this.itemPath = (isPageOrLayout ? canonicalPath(nodeRel) : canonicalPath(relPath)).replace(/\(|\)/g, '');
    this.varName = `${derivePrefix(relPath) || 'root'}Meta`;
  }

  /**
   * Reads the source MDX file, extracts its frontmatter, and generates
   * a TypeScript file exporting the metadata.
   */
  public update() {
    let content = '';
    try {
      content = fs.readFileSync(this.absPath, 'utf-8');
    } catch {
      return; // File probably deleted, handled by destroy()
    }

    const meta = extractFrontmatter(content);

    const moduleContent = [
      GENERATED_MARKER,
      `export const meta = ${JSON.stringify(meta, null, 2)};`,
      '',
      'export default meta;',
      '',
    ].join('\n');

    if (writeIfChanged(this.generatedFilePath, moduleContent)) {
      this.emitChange('update');
    }
  }

  /**
   * Removes the generated metadata file and cleans up the node.
   */
  public destroy() {
    try {
      fs.unlinkSync(this.generatedFilePath);
      this.emitChange('update');
    } catch {}
    this.emit('destroy');
    this.removeAllListeners();
  }

  private emitChange(kind: 'update' | 'reload') {
    this.emit('change', this.generatedFilePath, kind);
  }
}

/** Extracts YAML frontmatter bounded by --- markers into a javascript object. */
export function extractFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseYaml(text: string): unknown {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));

  let idx = 0;

  function parseBlock(currentIndent: number): unknown {
    if (idx >= lines.length) return {};

    const firstLine = lines[idx];
    const firstTrimmed = firstLine.trim();

    if (firstTrimmed === '-' || firstTrimmed.startsWith('- ')) {
      const list: unknown[] = [];
      while (idx < lines.length) {
        const line = lines[idx];
        const indent = line.length - line.trimStart().length;
        if (indent < currentIndent) break;
        const trimmed = line.trim();
        if (indent === currentIndent && (trimmed === '-' || trimmed.startsWith('- '))) {
          const valStr = trimmed === '-' ? '' : trimmed.slice(2).trim();
          idx++;
          if (!valStr && idx < lines.length && lines[idx].length - lines[idx].trimStart().length > currentIndent) {
            list.push(parseBlock(lines[idx].length - lines[idx].trimStart().length));
          } else {
            list.push(parseScalar(valStr));
          }
        } else {
          break;
        }
      }
      return list;
    }

    const obj: Record<string, unknown> = {};
    while (idx < lines.length) {
      const line = lines[idx];
      const indent = line.length - line.trimStart().length;
      if (indent < currentIndent) break;
      if (indent > currentIndent) {
        idx++;
        continue;
      }

      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) {
        idx++;
        continue;
      }

      const key = trimmed
        .slice(0, colonIdx)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      const valStr = trimmed.slice(colonIdx + 1).trim();
      idx++;

      if (!valStr) {
        if (idx < lines.length) {
          const nextIndent = lines[idx].length - lines[idx].trimStart().length;
          if (nextIndent > currentIndent) {
            obj[key] = parseBlock(nextIndent);
            continue;
          }
        }
        obj[key] = '';
      } else {
        obj[key] = parseScalar(valStr);
      }
    }
    return obj;
  }

  return parseBlock(0);
}

function parseScalar(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);

  if (val.startsWith('[') && val.endsWith(']')) {
    return val
      .slice(1, -1)
      .split(',')
      .map((item) => parseScalar(item.trim()));
  }

  if (val.startsWith('{') && val.endsWith('}')) {
    try {
      return JSON.parse(val);
    } catch {}
  }

  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }

  return val;
}
