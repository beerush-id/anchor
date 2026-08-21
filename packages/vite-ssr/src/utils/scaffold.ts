import path from 'node:path';
import type { FolderNode } from '../modules/folder-node.js';
import {
  deriveIndexName,
  deriveRouteName,
  type FileMap,
  FRAMEWORK_PACKAGE,
  type Framework,
  humanizeSegment,
} from './mapper.js';

/**
 * Decides the scaffold content for a newly created application or page file, or `undefined`
 * when the file should not be scaffolded (unknown file type).
 *
 * The caller is responsible for the empty-file checks — this is a pure decision function.
 * The `files` map is the fully resolved configuration (defaults merged with user overrides);
 * this module never merges or guesses.
 *
 * @param opts.base File base name (`app.tsx`, `client.tsx`, `worker.ts`, `page.tsx`, `layout.tsx`, `page.mdx`).
 * @param opts.folder The folder the file belongs to; required for page/layout/mdx files.
 * @param opts.framework Target UI framework for the scaffolded imports.
 * @param opts.files Resolved file name map (defaults merged with user overrides).
 * @param opts.srcDir Source directory relative to project root.
 * @param opts.pagesDir Pages directory relative to project root.
 */
export function scaffoldForFile(opts: {
  base: string;
  folder?: FolderNode;
  framework: Framework;
  files: FileMap;
  srcDir?: string;
  pagesDir?: string;
}): string | undefined {
  const { base, folder, framework, files, srcDir = 'src', pagesDir = 'pages' } = opts;

  if (base === files.entry) {
    return scaffoldAppTsx({ framework, files, srcDir, pagesDir });
  }

  if (base === files.client) {
    return scaffoldClientTsx({ framework, files });
  }

  if (base === files.workerEntry) {
    return scaffoldWorkerTs({ framework, files });
  }

  if (base === files.ambient) {
    return scaffoldGlobalDts();
  }

  if (!folder) return undefined;

  if (base === files.pageMdx || base === files.layoutMdx) {
    return scaffoldPageMdx({ segment: folder.segment });
  }

  if (base === files.layout) {
    return scaffoldLayoutTsx({ framework, rel: folder.rel, routeExport: deriveRouteName(folder.segment), files });
  }

  if (base === files.page) {
    const hasPage = folder.files.has(files.page) || folder.files.has(files.pageMdx);
    const hasLayout = folder.files.has(files.layout) || folder.files.has(files.layoutMdx);
    const routeExport = hasPage && hasLayout ? deriveIndexName(folder.segment) : deriveRouteName(folder.segment);

    return scaffoldPageTsx({ framework, rel: folder.rel, routeExport, files });
  }

  return undefined;
}

/**
 * Scaffolds an `app.tsx` entry module.
 */
export function scaffoldAppTsx(opts: {
  framework: Framework;
  files: FileMap;
  srcDir?: string;
  pagesDir?: string;
}): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = opts.files;
  const srcDir = opts.srcDir ?? 'src';
  const pagesDir = opts.pagesDir ?? 'pages';
  const relPages = path.relative(srcDir, pagesDir).replace(/\\/g, '/');
  const relPrefix = relPages.startsWith('.') ? relPages : `./${relPages}`;
  const layoutMod = `${relPrefix}/${files.layout.replace(/\.[^.]+$/, '.js')}`;
  return `import { type AppEntry, UIRouter } from '${pkg}';
import RootLayout from '${layoutMod}';
import router from './router.js';

export default (({ url }) => <UIRouter router={router} root={RootLayout} url={url} />) satisfies AppEntry;
`;
}

/**
 * Scaffolds a `client.tsx` client hydration module.
 */
export function scaffoldClientTsx(opts: { framework: Framework; files: FileMap }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = opts.files;
  const appMod = `./${files.entry.replace(/\.[^.]+$/, '.js')}`;

  if (opts.framework === 'solid') {
    return `import { hydrate } from 'solid-js/web';
import App from '${appMod}';
import router from './router.js';

router
  .activate(window.location.href)
  .then(() => {
    hydrate(() => <App />, document.getElementById('root')!);
  });
`;
  }

  return `import '${pkg}/client'; // MUST be first import

import { hydrateRoot } from 'react-dom/client';
import App from '${appMod}';
import router from './router.js';

router
  .activate(window.location.href)
  .then(() => {
    hydrateRoot(document.getElementById('root')!, <App />);
  });
`;
}

/**
 * Scaffolds a `worker.ts` server rendering entry module.
 */
export function scaffoldWorkerTs(opts: { framework: Framework; files: FileMap }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = opts.files;
  const appMod = `./${files.entry.replace(/\.[^.]+$/, '.js')}`;
  return `import { createApp } from '${pkg}/ssr';
import App from '${appMod}';
import router from './router.js';

export default createApp(router, App);
`;
}

/**
 * Scaffolds an ambient `global.d.ts` declarations file.
 */
export function scaffoldGlobalDts(): string {
  return `/// <reference types="@airlib/vite/ambient" />

interface AirRouteMeta {
  name?: string;
  label?: string;
}
`;
}

/**
 * Scaffolds a `page.tsx` module.
 */
export function scaffoldPageTsx(opts: {
  framework: Framework;
  rel: string;
  routeExport: string;
  files: FileMap;
}): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = opts.files;
  const routeMod = `./${files.route.replace(/\.[^.]+$/, '.js')}`;
  const leaf = opts.rel.split('/').pop() || '';
  const name = opts.routeExport === deriveIndexName(leaf) && !opts.rel ? 'Home' : humanizeSegment(leaf);
  const isFolderRoute = opts.routeExport === deriveRouteName(leaf);
  const importLine = isFolderRoute
    ? `import ${opts.routeExport} from '${routeMod}';`
    : `import { ${opts.routeExport} } from '${routeMod}';`;

  return `import { page } from '${pkg}';
${importLine}

export default page(${opts.routeExport}).render(() => (
  <>
    <h1>${name}</h1>
  </>
));
`;
}

/**
 * Scaffolds a `layout.tsx` module.
 */
export function scaffoldLayoutTsx(opts: {
  framework: Framework;
  rel?: string;
  routeExport?: string;
  files: FileMap;
}): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = opts.files;
  const routeMod = `./${files.route.replace(/\.[^.]+$/, '.js')}`;
  const routeExport = opts.routeExport || deriveRouteName(opts.rel ? opts.rel.split('/').pop() || '' : '');

  return `import { page } from '${pkg}';
import ${routeExport} from '${routeMod}';

export default page(${routeExport}).render(({ children }) => children);
`;
}

/**
 * Scaffolds a `page.mdx` module with a frontmatter block.
 */
export function scaffoldPageMdx(opts: { segment: string }): string {
  const title = humanizeSegment(opts.segment);

  return `---
title: ${title}
---

# ${title}
`;
}
