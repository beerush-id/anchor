import fs from 'node:fs';
import path from 'node:path';
import type { GeneratedFile } from './generate.js';
import {
  canonicalPath,
  derivePrefix,
  type FolderNode,
  flattenTree,
  GENERATED_MARKER,
  importSpecifier,
} from './model.js';

export type MetadataCacheEntry = {
  filePath: string;
  content: string;
  itemPath: string;
  varName: string;
  fromPath: string;
};

export type MetadataCache = Map<string, MetadataCacheEntry>;

/**
 * Generates the per-file metadata modules and root index for all discovered MDX files across the tree.
 * Utilizes an optional in-memory cache to prevent re-reading untouched files from disk.
 */
export function generateMetadata(opts: {
  root: FolderNode;
  metadataDir: string;
  pagesDir?: string;
  cache?: MetadataCache;
}): GeneratedFile[] {
  const { root, metadataDir, cache } = opts;
  const pagesDir = opts.pagesDir ?? root.dir;
  const files: GeneratedFile[] = [];
  const indexFile = path.join(metadataDir, 'index.ts');

  const entries: { path: string; varName: string; fromPath: string }[] = [];

  for (const node of flattenTree(root)) {
    for (const mdxFile of node.mdxFiles) {
      const absPath = path.join(node.dir, mdxFile);
      let entry = cache?.get(absPath);

      if (!entry) {
        generateSingleMetadata({ absPath, pagesDir, metadataDir, cache });
        entry = cache?.get(absPath);
        if (!entry) {
          const generated = generateSingleMetadata({ absPath, pagesDir, metadataDir });
          if (generated) {
            files.push(generated);
            const rel = path.relative(pagesDir, absPath).replace(/\\/g, '/');
            const fileName = path.basename(absPath, '.mdx');
            const relDir = path.dirname(rel);
            const nodeRel = relDir === '.' ? '' : relDir;
            const relPath = nodeRel ? `${nodeRel}/${fileName}` : fileName;
            const isPageOrLayout = fileName === 'page' || fileName === 'layout';
            const itemPath = isPageOrLayout ? canonicalPath(nodeRel) : canonicalPath(relPath);
            const varName = `${derivePrefix(relPath) || 'root'}Meta`;
            const fromPath = importSpecifier(indexFile, generated.filePath);
            entries.push({
              path: itemPath.replace(/\(|\)/g, ''),
              varName,
              fromPath,
            });
          }
          continue;
        }
      }

      files.push({ filePath: entry.filePath, content: entry.content });
      entries.push({
        path: entry.itemPath,
        varName: entry.varName,
        fromPath: entry.fromPath,
      });
    }
  }

  entries.sort((a, b) => a.fromPath.localeCompare(b.fromPath));

  const imports = entries.map((entry) => `import ${entry.varName} from '${entry.fromPath}';`);
  const lines = [
    GENERATED_MARKER,
    ...imports,
    '',
    'export default [',
    ...entries.map((entry) => `  { path: '${entry.path}', meta: ${entry.varName} },`),
    '];',
    '',
  ];

  files.push({ filePath: indexFile, content: lines.join('\n') });

  return files;
}

/**
 * Generates the metadata module for a single MDX file and updates the in-memory cache.
 */
export function generateSingleMetadata(opts: {
  absPath: string;
  pagesDir: string;
  metadataDir: string;
  cache?: MetadataCache;
}): GeneratedFile | undefined {
  const { absPath, pagesDir, metadataDir, cache } = opts;
  let content = '';
  try {
    content = fs.readFileSync(absPath, 'utf-8');
  } catch {
    return undefined;
  }

  const meta = extractFrontmatter(content);
  const rel = path.relative(pagesDir, absPath).replace(/\\/g, '/');
  const fileName = path.basename(absPath, '.mdx');
  const relDir = path.dirname(rel);
  const nodeRel = relDir === '.' ? '' : relDir;
  const relPath = nodeRel ? `${nodeRel}/${fileName}` : fileName;
  const targetFile = path.join(metadataDir, `${relPath}.ts`);
  const indexFile = path.join(metadataDir, 'index.ts');

  const moduleContent = [
    GENERATED_MARKER,
    `export const meta = ${JSON.stringify(meta, null, 2)};`,
    '',
    'export default meta;',
    '',
  ].join('\n');

  const isPageOrLayout = fileName === 'page' || fileName === 'layout';
  const itemPath = isPageOrLayout ? canonicalPath(nodeRel) : canonicalPath(relPath);
  const varName = `${derivePrefix(relPath) || 'root'}Meta`;
  const fromPath = importSpecifier(indexFile, targetFile);

  if (cache) {
    cache.set(absPath, {
      filePath: targetFile,
      content: moduleContent,
      itemPath: itemPath.replace(/\(|\)/g, ''),
      varName,
      fromPath,
    });
  }

  return { filePath: targetFile, content: moduleContent };
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
