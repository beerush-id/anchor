import { afterEach, describe, expect, it } from 'vitest';
import { cleanFixture, makeFixture, readFixture, writeFixture } from './fixture.js';
import { makeApp } from './make-sync.js';

describe('route metadata linking (linkMetadata)', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('chains .meta() with @airstack/metadata import for leaf MDX pages when linkMetadata is enabled', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/page.mdx': '---\ntitle: Docs\n---\n# Docs\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    const metaPos = routeContent.indexOf("import docsMeta from '@airstack/metadata/docs/page.js';");
    const parentPos = routeContent.indexOf("import rootRoute from '../route.js';");
    expect(metaPos).toBeGreaterThan(-1);
    expect(parentPos).toBeGreaterThan(-1);
    expect(metaPos).toBeLessThan(parentPos);
    expect(routeContent).toContain("export const docsRoute = rootRoute.route('/docs').meta(docsMeta);");
  });

  it('chains .meta() on index route when folder has layout and page.mdx', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/layout.tsx': 'export default () => null;',
      'pages/docs/page.mdx': '---\ntitle: Docs Home\n---\n# Docs\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIndexMeta from '@airstack/metadata/docs/page.js';");
    expect(routeContent).toContain("export const docsRoute = rootRoute.route('/docs');");
    expect(routeContent).toContain("export const docsIndexRoute = docsRoute.route('/').meta(docsIndexMeta);");
  });

  it('chains .meta() for named MDX pages with camelCase identifier', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/getting-started.page.mdx': '---\ntitle: Getting Started\n---\n# Getting Started\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsGettingStartedMeta from '@airstack/metadata/docs/getting-started.js';");
    expect(routeContent).toContain(
      "export const docsGettingStartedRoute = docsRoute.route('/getting-started').meta(docsGettingStartedMeta);"
    );
  });

  it('scaffolds root route.ts with metadata linking for root leaf, index, and named MDX pages', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/page.mdx': '---\ntitle: Home\n---\n',
      'pages/layout.tsx': 'export default () => null;',
      'pages/guide.page.mdx': '---\ntitle: Guide\n---\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/route.ts');
    expect(routeContent).toContain("import pageMeta from '@airstack/metadata/page.js';");
    expect(routeContent).toContain("import guideMeta from '@airstack/metadata/guide.js';");
    expect(routeContent).toContain('export const rootRoute = router.route();');
    expect(routeContent).toContain("export const indexRoute = rootRoute.route('/').meta(pageMeta);");
    expect(routeContent).toContain("export const guideRoute = rootRoute.route('/guide').meta(guideMeta);");
  });

  it('scaffolds root leaf route without layout using .meta()', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/page.mdx': '---\ntitle: Home\n---\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/route.ts');
    expect(routeContent).toContain("import pageMeta from '@airstack/metadata/page.js';");
    expect(routeContent).toContain('export const rootRoute = router.route().meta(pageMeta);');
  });

  it('scaffolds top-level grouped route folders with metadata linking', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/(app)/page.mdx': '---\ntitle: App\n---\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/(app)/route.ts');
    expect(routeContent).toContain("import appMeta from '@airstack/metadata/(app)/page.js';");
    expect(routeContent).toContain("export const appRoute = router.add('/app').meta(appMeta);");
  });

  it('preserves user-authored .meta() calls and does not inject redundant imports', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/getting-started.page.mdx': '---\ntitle: Getting Started\n---\n',
      'pages/docs/route.ts': [
        "import rootRoute from '../route.js';",
        '',
        "export const docsRoute = rootRoute.route('/docs');",
        "export const docsGettingStartedRoute = docsRoute.route('/getting-started').meta({ custom: true });",
        '',
        'export default docsRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain('.meta({ custom: true })');
    expect(routeContent).not.toContain('import docsGettingStartedMeta');
    expect(routeContent).not.toContain('.meta(docsGettingStartedMeta)');
  });

  it('does not add metadata imports or modifiers for plain TSX pages', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/about/page.tsx': 'export default () => null;',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/about/route.ts');
    expect(routeContent).not.toContain('@airstack/metadata');
    expect(routeContent).not.toContain('.meta(');
    expect(routeContent).toContain("export const aboutRoute = rootRoute.route('/about');");
  });

  it('does not link metadata when linkMetadata is false', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/getting-started.page.mdx': '---\ntitle: Getting Started\n---\n',
    });

    app = makeApp(dir, { linkMetadata: false });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).not.toContain('@airstack/metadata');
    expect(routeContent).not.toContain('.meta(');
  });

  it('syncs metadata import and modifier when an MDX file is added dynamically', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/page.tsx': 'export default () => null;',
    });

    app = makeApp(dir, { linkMetadata: true });

    writeFixture(dir, {
      'pages/docs/intro.page.mdx': '---\ntitle: Intro\n---\n# Intro\n',
    });

    app.rootFolder.children.get('docs')?.handleFileAdded('intro.page.mdx');

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIntroMeta from '@airstack/metadata/docs/intro.js';");
    expect(routeContent).toContain("export const docsIntroRoute = docsRoute.route('/intro').meta(docsIntroMeta);");
  });

  it('gap-fills .meta() onto existing generated declarations for folder, index, and named routes', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/layout.tsx': 'export default () => null;',
      'pages/docs/page.mdx': '---\ntitle: Docs\n---\n',
      'pages/docs/guide.page.mdx': '---\ntitle: Guide\n---\n',
      'pages/docs/route.ts': [
        "import rootRoute from '../route.js';",
        '',
        '// @generated - do not edit the variable name',
        "export const docsRoute = rootRoute.route('/docs');",
        '',
        '// @generated - do not edit the variable name',
        "export const docsIndexRoute = docsRoute.route('/');",
        '',
        '// @generated - do not edit the variable name',
        "export const docsGuideRoute = docsRoute.route('/guide');",
        '',
        '// @generated - do not edit',
        'export default docsRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIndexMeta from '@airstack/metadata/docs/page.js';");
    expect(routeContent).toContain("import docsGuideMeta from '@airstack/metadata/docs/guide.js';");
    expect(routeContent).toContain("export const docsIndexRoute = docsRoute.route('/').meta(docsIndexMeta);");
    expect(routeContent).toContain("export const docsGuideRoute = docsRoute.route('/guide').meta(docsGuideMeta);");
  });

  it('gap-fills .meta() onto existing generated leaf folder route', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/leaf/page.mdx': '---\ntitle: Leaf\n---\n',
      'pages/leaf/route.ts': [
        "import rootRoute from '../route.js';",
        '',
        '// @generated - do not edit the variable name',
        "export const leafRoute = rootRoute.route('/leaf');",
        '',
        '// @generated - do not edit',
        'export default leafRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/leaf/route.ts');
    expect(routeContent).toContain("import leafMeta from '@airstack/metadata/leaf/page.js';");
    expect(routeContent).toContain("export const leafRoute = rootRoute.route('/leaf').meta(leafMeta);");
  });

  it('emits missing index route with .meta() when added mid-run to existing route.ts', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/layout.tsx': 'export default () => null;',
      'pages/docs/route.ts': [
        "import rootRoute from '../route.js';",
        '',
        '// @generated - do not edit the variable name',
        "export const docsRoute = rootRoute.route('/docs');",
        '',
        '// @generated - do not edit',
        'export default docsRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    writeFixture(dir, {
      'pages/docs/page.mdx': '---\ntitle: Docs Index\n---\n# Index\n',
    });

    app.rootFolder.children.get('docs')?.handleFileAdded('page.mdx');

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIndexMeta from '@airstack/metadata/docs/page.js';");
    expect(routeContent).toContain("export const docsIndexRoute = docsRoute.route('/').meta(docsIndexMeta);");
  });

  it('prepends metadata import when route.ts has zero imports', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/page.mdx': '---\ntitle: Docs\n---\n',
      'pages/docs/route.ts': [
        '// @generated - do not edit the variable name',
        "export const docsRoute = rootRoute.route('/docs');",
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsMeta from '@airstack/metadata/docs/page.js';");
  });

  it('ignores routes with non-string path arguments safely in routeBinding', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/page.mdx': '---\ntitle: Docs\n---\n',
      'pages/docs/route.ts': [
        "import rootRoute from '../route.js';",
        'const customPath = 123;',
        'export const docsRoute = rootRoute.route(customPath);',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain('export const docsRoute = rootRoute.route(customPath);');
  });

  it('skips UI wiring safely when UI file has syntax errors', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/page.tsx': 'export default () => { invalid syntax ;',
    });

    app = makeApp(dir);

    const pageContent = readFixture(dir, 'pages/docs/page.tsx');
    expect(pageContent).toBe('export default () => { invalid syntax ;');
  });
});
