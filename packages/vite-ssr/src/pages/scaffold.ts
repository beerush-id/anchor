import { FRAMEWORK_PACKAGE, type Framework } from './generate.js';
import {
  DEFAULT_FILE_MAP,
  deriveRouteName,
  type FileMap,
  type FolderNode,
  humanizeSegment,
  routeExportForFolder,
} from './model.js';

/**
 * Decides the scaffold content for a newly created application or page file, or `undefined`
 * when the file should not be scaffolded (unknown file type).
 *
 * The caller is responsible for the empty-file checks — this is a pure decision function.
 */
export function scaffoldForFile(opts: {
  /** File base name (`app.tsx`, `client.tsx`, `worker.ts`, `page.tsx`, `layout.tsx`, `page.mdx`). */
  base: string;
  folder?: FolderNode;
  framework: Framework;
  files?: Partial<FileMap>;
}): string | undefined {
  const { base, folder, framework } = opts;
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };

  if (base === files.entry) {
    return scaffoldAppTsx({ framework, files });
  }

  if (base === files.client) {
    return scaffoldClientTsx({ framework, files });
  }

  if (base === files.workerEntry) {
    return scaffoldWorkerTs({ framework, files });
  }

  if (!folder) return undefined;

  if (base === files.pageMdx || base === files.layoutMdx) {
    return scaffoldPageMdx({ segment: folder.segment });
  }

  if (base === files.layout) {
    if (!folder.rel) return scaffoldLayoutTsx({ framework, files });
    return scaffoldLayoutTsx({ framework, rel: folder.rel, routeExport: deriveRouteName(folder.rel), files });
  }

  if (base === files.page) {
    return scaffoldPageTsx({ framework, rel: folder.rel, routeExport: routeExportForFolder(folder), files });
  }

  return undefined;
}

/**
 * Scaffolds an `app.tsx` entry module.
 */
export function scaffoldAppTsx(opts: { framework: Framework; files?: Partial<FileMap> }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };
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
export function scaffoldClientTsx(opts: { framework: Framework; files?: Partial<FileMap> }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };
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
export function scaffoldWorkerTs(opts: { framework: Framework; files?: Partial<FileMap> }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };
  const appMod = `./${files.entry.replace(/\.[^.]+$/, '.js')}`;
  return `import { createApp } from '${pkg}/ssr';
import App from '${appMod}';
import router from './router.js';

export default createApp(router, App);
`;
}

/**
 * Scaffolds a `page.tsx` module.
 */
export function scaffoldPageTsx(opts: {
  framework: Framework;
  rel: string;
  routeExport: string;
  files?: Partial<FileMap>;
}): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };
  const routeMod = `./${files.route.replace(/\.[^.]+$/, '.js')}`;
  const name = opts.routeExport === 'indexRoute' ? 'Home' : humanizeSegment(opts.rel.split('/').pop() || '');

  return `import { page } from '${pkg}';
import { ${opts.routeExport} } from '${routeMod}';

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
  files?: Partial<FileMap>;
}): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const files = { ...DEFAULT_FILE_MAP, ...opts.files };
  const routeMod = `./${files.route.replace(/\.[^.]+$/, '.js')}`;

  if (!opts.rel) {
    return `import { page } from '${pkg}';
import { rootRoute } from '${routeMod}';

export default page(rootRoute).render(({ children }) => children);
`;
  }

  return `import { page } from '${pkg}';
import { ${opts.routeExport} } from '${routeMod}';

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
