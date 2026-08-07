import path from 'node:path';
import { AppNode } from '../src/pages/app-node.js';
import type { FolderNode } from '../src/pages/folder-node.js';
import type { Framework } from '../src/pages/generate.js';
import { fixturePath, readFixture } from './fixture.js';

export type MakeAppOptions = {
  framework?: Framework;
  /** Route manifest generation. Defaults to true (matches airPages defaults). */
  manifest?: boolean;
  /** MDX metadata generation. Defaults to true (matches airPages defaults). */
  metadata?: boolean;
  /** Scaffolding of empty page files. Defaults to true (matches airPages defaults). */
  scaffold?: boolean;
};

/**
 * Boots an AppNode over a fixture directory. The router file lives at the
 * fixture root so generated first-level route files import `../router.js`.
 */
export function makeApp(dir: string, extra: MakeAppOptions = {}) {
  return new AppNode({
    root: dir,
    pagesDir: fixturePath(dir, 'pages'),
    appDir: fixturePath(dir, 'src'),
    routerFile: fixturePath(dir, 'router.ts'),
    framework: extra.framework ?? 'react',
    manifestEnabled: extra.manifest ?? true,
    metadataEnabled: extra.metadata ?? true,
    scaffoldEnabled: extra.scaffold ?? true,
  });
}

/**
 * Small delay that lets the deferred (50 ms) scaffold writer flush.
 * Route and manifest files are written synchronously; only page/layout
 * scaffolds are deferred via setTimeout inside RouteNode.
 */
export function flushScaffold(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

/** The folder node for a pages-relative path (`''` = the pages root). */
export function folderAt(app: AppNode, rel: string): FolderNode | undefined {
  const segments = rel.split('/').filter(Boolean);
  return app.rootFolder.findNode(path.join(app.rootFolder.dir, ...segments));
}

/** Reads a generated manifest index file under `.airstack/manifest`. */
export function readManifest(dir: string, rel = 'index.ts'): string {
  return readFixture(dir, `.airstack/manifest/${rel}`);
}

/** Reads a generated metadata index/module file under `.airstack/metadata`. */
export function readMetadata(dir: string, rel: string): string {
  return readFixture(dir, `.airstack/metadata/${rel}`);
}
