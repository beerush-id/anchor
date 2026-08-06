import fs from 'node:fs';
import path from 'node:path';
import { type Framework, generateRouteFiles } from './generate.js';
import { generateManifest } from './manifest.js';
import { generateMetadata, generateSingleMetadata, type MetadataCache } from './metadata.js';
import { DEFAULT_FILE_MAP, type FileMap, type FolderNode, findFolder, GENERATED_MARKER, scanPages } from './model.js';
import { scaffoldForFile } from './scaffold.js';

export type PagesSyncOptions = {
  /** Absolute pages directory. */
  pagesDir: string;
  /** Absolute router file exporting `rootRoute`. */
  routerFile: string;

  /** Absolute output directory for generated manifest (.airstack/manifest). */
  manifestDir?: string;
  /** Whether manifest generation is enabled. Defaults to true. */
  manifest?: boolean;
  /** Absolute output directory for generated metadata (.airstack/metadata). */
  metadataDir?: string;
  /** Whether metadata generation is enabled. Defaults to true. */
  metadata?: boolean;
  /** Framework to use (react/solid) */
  framework: Framework;
  /** Whether to scaffold empty page files. Defaults to true. */
  scaffold?: boolean;
  /** Whether IRPC is enabled. */
  irpc?: boolean;
  /** Called during a refresh when the router file does not exist. */
  onRouterMissing?: () => void;
  /** Configurable file names. */
  files?: Partial<FileMap>;
};

/**
 * The vite-independent core of the pages pipeline: scans the pages directory,
 * writes colocated per-folder `route.ts` files (only when missing),
 * emits the route manifest, and scaffolds empty page files.
 */
export function createPagesSync(opts: PagesSyncOptions) {
  const scaffoldEnabled = opts.scaffold !== false;
  const files: FileMap = { ...DEFAULT_FILE_MAP, ...opts.files };
  const metadataCache: MetadataCache = new Map();
  let tree = scanPages(opts.pagesDir, opts.irpc, files);

  /** Rescans the tree and applies all generation diffs. Returns true if files changed. */
  function refresh(): boolean {
    let changed = false;
    tree = scanPages(opts.pagesDir, opts.irpc, files);

    if (scaffoldEnabled) {
      scaffoldAll0ByteFiles(tree);
      const appDir = path.dirname(opts.routerFile);
      for (const file of [files.entry, files.client, files.workerEntry]) {
        scaffoldFile(path.join(appDir, file));
      }
    }

    if (!fs.existsSync(opts.routerFile)) {
      opts.onRouterMissing?.();
    }

    const routeFiles = generateRouteFiles({
      root: tree,
      routerFile: opts.routerFile,
      files,
    });

    for (const file of routeFiles) {
      if (!fs.existsSync(file.filePath)) {
        fs.mkdirSync(path.dirname(file.filePath), { recursive: true });
        fs.writeFileSync(file.filePath, file.content);
        changed = true;
      } else if (file.indexRoute) {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        if (!content.includes(GENERATED_MARKER)) continue;

        const exportPrefix = file.indexRoute.split('=')[0].trim();
        if (!content.includes(exportPrefix)) {
          const updated = content.replace(GENERATED_MARKER, `${file.indexRoute}\n\n${GENERATED_MARKER}`);
          if (writeIfChanged(file.filePath, updated)) changed = true;
        }
      }
    }

    if (opts.manifest !== false && opts.manifestDir) {
      const manifestFiles = generateManifest({
        root: tree,
        manifestDir: opts.manifestDir,
        framework: opts.framework,
        files,
      });

      for (const file of manifestFiles) {
        if (writeIfChanged(file.filePath, file.content)) changed = true;
      }
    }

    if (opts.metadata !== false && opts.metadataDir) {
      const metadataFiles = generateMetadata({
        root: tree,
        metadataDir: opts.metadataDir,
        pagesDir: opts.pagesDir,
        cache: metadataCache,
      });

      const validPaths = new Set(metadataFiles.map((f) => f.filePath));
      for (const file of metadataFiles) {
        if (writeIfChanged(file.filePath, file.content)) changed = true;
      }
      if (cleanupObsoleteFiles(opts.metadataDir, validPaths)) changed = true;
    }

    return changed;
  }

  /** Handles localized content modification without rescanning the directory or touching unrelated files. */
  function onChange(file: string): boolean {
    if (opts.metadata !== false && opts.metadataDir && file.endsWith('.mdx') && file.startsWith(opts.pagesDir)) {
      const generated = generateSingleMetadata({
        absPath: file,
        pagesDir: opts.pagesDir,
        metadataDir: opts.metadataDir,
        cache: metadataCache,
      });
      if (generated && writeIfChanged(generated.filePath, generated.content)) {
        return true;
      }
    }
    return false;
  }

  /** Handles new file creation with localized scaffolding and cache-assisted directory synchronization. */
  function onAdd(file: string): boolean {
    scaffoldFile(file);
    return refresh();
  }

  /** Handles localized file deletion, cleaning cached metadata before updating index manifests. */
  function onUnlink(file: string): boolean {
    if (opts.metadata !== false && opts.metadataDir && file.endsWith('.mdx') && file.startsWith(opts.pagesDir)) {
      const cached = metadataCache.get(file);
      if (cached) {
        try {
          fs.unlinkSync(cached.filePath);
        } catch {}
        metadataCache.delete(file);
      }
    }
    return refresh();
  }

  /**
   * Scaffolds starter content into a newly created page or application entry file.
   * Only ever writes to 0-byte files — moves/copies surface as `add` too, and
   * user/IDE content must never be clobbered.
   */
  function scaffoldFile(file: string): void {
    if (!scaffoldEnabled) return;

    const base = path.basename(file);
    const isAppEntry = base === files.entry || base === files.client || base === files.workerEntry;

    let shouldWrite = false;
    try {
      if (fs.statSync(file).size === 0) shouldWrite = true;
    } catch {
      if (isAppEntry) shouldWrite = true;
    }

    if (!shouldWrite) return;

    const folder = isAppEntry ? undefined : findFolder(tree, path.dirname(file));
    if (!isAppEntry && !folder) return;

    const content = scaffoldForFile({ base, folder, framework: opts.framework, files });
    if (!content) return;

    try {
      if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      }
    } catch {}
  }

  function scaffoldAll0ByteFiles(node: FolderNode): void {
    const possibleFiles = [files.page, files.pageMdx, files.layout, files.layoutMdx];
    for (const file of possibleFiles) {
      scaffoldFile(path.join(node.dir, file));
    }
    for (const child of node.children) {
      scaffoldAll0ByteFiles(child);
    }
  }

  function writeIfChanged(filePath: string, content: string): boolean {
    try {
      if (fs.readFileSync(filePath, 'utf-8') === content) return false;
    } catch {}

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);

    return true;
  }

  return {
    refresh,
    onChange,
    onAdd,
    onUnlink,
    scaffoldFile,
    get tree() {
      return tree;
    },
  };
}

export type PagesSync = ReturnType<typeof createPagesSync>;

function cleanupObsoleteFiles(dir: string, keepPaths: Set<string>): boolean {
  let changed = false;
  if (!fs.existsSync(dir)) return changed;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'package.json') continue;
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (cleanupObsoleteFiles(absPath, keepPaths)) changed = true;
      try {
        if (fs.readdirSync(absPath).length === 0) {
          fs.rmdirSync(absPath);
        }
      } catch {}
    } else if (entry.isFile() && !keepPaths.has(absPath)) {
      try {
        fs.unlinkSync(absPath);
        changed = true;
      } catch {}
    }
  }

  return changed;
}
