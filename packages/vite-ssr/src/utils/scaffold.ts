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
 */
export function scaffoldForFile(opts: {
  base: string;
  folder?: FolderNode;
  framework: Framework;
  files: FileMap;
}): string | undefined {
  const { base, folder, framework, files } = opts;

  if (base === files.entry) {
    return scaffoldAppTsx({ framework, files });
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
    if (!folder.rel) return scaffoldLayoutTsx({ framework, files });
    return scaffoldLayoutTsx({ framework, rel: folder.rel, routeExport: deriveRouteName(folder.segment), files });
  }

  if (base === files.page) {
    const hasPage = folder.files.has(files.page) || folder.files.has(files.pageMdx);
    const hasLayout = folder.files.has(files.layout) || folder.files.has(files.layoutMdx);
    const routeExport = !folder.rel
      ? hasPage && hasLayout
        ? 'indexRoute'
        : 'rootRoute'
      : hasPage && hasLayout
        ? deriveIndexName(folder.segment)
        : deriveRouteName(folder.segment);

    return scaffoldPageTsx({ framework, rel: folder.rel, routeExport, files });
  }

  return undefined;
}

/**
 * Scaffolds an `app.tsx` entry module.
 */
export function scaffoldAppTsx(opts: { framework: Framework; files: FileMap }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = opts.files;
  const layoutMod = `./pages/${files.layout.replace(/\.[^.]+$/, '.js')}`;
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
  return `/// <reference types="@anchorlib/vite-ssr/ambient" />

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
  const name = opts.routeExport === 'indexRoute' ? 'Home' : humanizeSegment(opts.rel.split('/').pop() || '');
  const isFolderRoute =
    opts.routeExport === 'rootRoute' || opts.routeExport === deriveRouteName(opts.rel.split('/').pop() || '');
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

  if (!opts.rel) {
    return `import { page } from '${pkg}';
import rootRoute from '${routeMod}';

export default page(rootRoute).render(({ children }) => children);
`;
  }

  return `import { page } from '${pkg}';
import ${opts.routeExport} from '${routeMod}';

export default page(${opts.routeExport}).render(({ children }) => children);
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
