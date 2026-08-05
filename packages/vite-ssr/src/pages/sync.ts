import fs from 'node:fs';
import path from 'node:path';
import { type Framework, generateManifest, generateRouteFiles, scaffoldForFile } from './generate.js';
import { DEFAULT_FILE_MAP, type FileMap, type FolderNode, findFolder, GENERATED_MARKER, scanPages } from './model.js';

export type PagesSyncOptions = {
  /** Absolute pages directory. */
  pagesDir: string;
  /** Absolute router file exporting `rootRoute`. */
  routerFile: string;

  /** Absolute output directory for generated manifest (.airstack/manifest). */
  manifestDir: string;
  framework: Framework;
  /** Whether to scaffold empty page files. Defaults to true. */
  scaffold?: boolean;
  /** Whether IRPC is enabled. */
  irpc?: boolean;
  /** Called during a refresh when the router file does not exist. */
  onRouterMissing?: () => void;
  /** Configurable file names. */
  files?: FileMap;
};

/**
 * The vite-independent core of the pages pipeline: scans the pages directory,
 * writes colocated per-folder `route.ts` files (only when missing),
 * emits the route manifest, and scaffolds empty page files.
 */
export function createPagesSync(opts: PagesSyncOptions) {
  const scaffoldEnabled = opts.scaffold !== false;
  const files = opts.files || DEFAULT_FILE_MAP;
  let tree = scanPages(opts.pagesDir, opts.irpc, files);

  /** Rescans the tree and applies all generation diffs. Returns true if files changed. */
  function refresh(): boolean {
    let changed = false;
    tree = scanPages(opts.pagesDir, opts.irpc, files);

    if (scaffoldEnabled) {
      scaffoldAll0ByteFiles(tree);
      const appDir = path.dirname(opts.routerFile);
      for (const file of ['app.tsx', 'client.tsx', 'worker.ts']) {
        scaffoldFile(path.join(appDir, file));
      }
    }

    if (!fs.existsSync(opts.routerFile)) {
      opts.onRouterMissing?.();
    }

    const routeFiles = generateRouteFiles({
      root: tree,
      routerFile: opts.routerFile,
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

    const manifestFiles = generateManifest({
      root: tree,
      manifestDir: opts.manifestDir,
      framework: opts.framework,
    });

    for (const file of manifestFiles) {
      if (writeIfChanged(file.filePath, file.content)) changed = true;
    }

    return changed;
  }

  /**
   * Scaffolds starter content into a newly created page or application entry file.
   * Only ever writes to 0-byte files — moves/copies surface as `add` too, and
   * user/IDE content must never be clobbered.
   */
  function scaffoldFile(file: string): void {
    if (!scaffoldEnabled) return;

    const base = path.basename(file);
    const isAppEntry = base === 'app.tsx' || base === 'client.tsx' || base === 'worker.ts';

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
    scaffoldFile,
    get tree() {
      return tree;
    },
  };
}

export type PagesSync = ReturnType<typeof createPagesSync>;
