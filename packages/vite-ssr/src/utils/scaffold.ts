import type { FileMap, Framework } from '../modules/env.js';
import type { FolderNode } from '../modules/folder-node.js';
import {
  deriveEntryImport,
  deriveIndexName,
  deriveLayoutImport,
  deriveNamedRouteName,
  deriveRouteName,
  deriveRouterImport,
  FRAMEWORK_PACKAGE,
  humanizeSegment,
  isNamedPage,
  namedPageName,
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
    return scaffoldAppTsx({ framework });
  }

  if (base === files.client) {
    return scaffoldClientTsx({ framework });
  }

  if (base === files.workerEntry) {
    return scaffoldWorkerTs({ framework });
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

  if (isNamedPage(base, files)) {
    const name = namedPageName(base, files);
    if (base.endsWith(`.${files.pageMdx}`)) {
      return scaffoldPageMdx({ segment: name });
    }
    const routeExport = deriveNamedRouteName(folder.segment, name);
    return scaffoldPageTsx({
      framework,
      rel: folder.rel ? `${folder.rel}/${name}` : name,
      routeExport,
      files,
    });
  }

  return undefined;
}

/**
 * Scaffolds an `app.tsx` entry module.
 */
export function scaffoldAppTsx(opts: { framework: Framework }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const layoutImport = deriveLayoutImport();
  const routerImport = deriveRouterImport();

  return `import { type AppEntry, UIRouter } from '${pkg}';
import RootLayout from '${layoutImport}';
import router from '${routerImport}';

export default (({ url }) => <UIRouter router={router} root={RootLayout} url={url} />) satisfies AppEntry;
`;
}

/**
 * Scaffolds a `client.tsx` client hydration module.
 */
export function scaffoldClientTsx(opts: { framework: Framework }): string {
  const appImport = deriveEntryImport();
  const routerImport = deriveRouterImport();

  if (opts.framework === 'solid') {
    return `import { hydrate } from 'solid-js/web';
import App from '${appImport}';
import router from '${routerImport}';

router
  .activate(window.location.href)
  .then(() => {
    hydrate(() => <App />, document.getElementById('root')!);
  });
`;
  }

  return `import { hydrateRoot } from 'react-dom/client';
import App from '${appImport}';
import router from '${routerImport}';

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
export function scaffoldWorkerTs(opts: { framework: Framework }): string {
  const pkg = FRAMEWORK_PACKAGE[opts.framework];
  const appImport = deriveEntryImport();
  const routerImport = deriveRouterImport();

  return `import { createApp } from '${pkg}/ssr';
import App from '${appImport}';
import router from '${routerImport}';

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
