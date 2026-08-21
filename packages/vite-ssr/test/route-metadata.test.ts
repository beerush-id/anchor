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

  it('chains .meta() with @airlib-cache/metadata import for leaf MDX pages when linkMetadata is enabled', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/page.mdx': '---\ntitle: Docs\n---\n# Docs\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    const metaPos = routeContent.indexOf("import docsMeta from '@airlib-cache/metadata/docs/page.js';");
    const parentPos = routeContent.indexOf("import parentRoute from '../route.js';");
    expect(metaPos).toBeGreaterThan(-1);
    expect(parentPos).toBeGreaterThan(-1);
    expect(metaPos).toBeLessThan(parentPos);
    expect(routeContent).toContain("const route = parentRoute.route('/docs').meta(docsMeta);");
    expect(routeContent).toContain('export const docsRoute = route;');
  });

  it('chains .meta() on index route when folder has layout and page.mdx', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/layout.tsx': 'export default () => null;',
      'pages/docs/page.mdx': '---\ntitle: Docs Home\n---\n# Docs\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIndexMeta from '@airlib-cache/metadata/docs/page.js';");
    expect(routeContent).toContain("const route = parentRoute.route('/docs');");
    expect(routeContent).toContain("const indexRoute = route.route('/').meta(docsIndexMeta);");
    expect(routeContent).toContain('export const docsRoute = route;');
    expect(routeContent).toContain('export const docsIndexRoute = indexRoute;');
  });

  it('chains .meta() for named MDX pages with camelCase identifier', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/getting-started.page.mdx': '---\ntitle: Getting Started\n---\n# Getting Started\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain(
      "import docsGettingStartedMeta from '@airlib-cache/metadata/docs/getting-started.js';"
    );
    expect(routeContent).toContain(
      "const gettingStartedRoute = route.route('/getting-started').meta(docsGettingStartedMeta);"
    );
    expect(routeContent).toContain('export const docsGettingStartedRoute = gettingStartedRoute;');
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
    expect(routeContent).toContain("import pageMeta from '@airlib-cache/metadata/page.js';");
    expect(routeContent).toContain("import guideMeta from '@airlib-cache/metadata/guide.js';");
    expect(routeContent).toContain('const route = router.route();');
    expect(routeContent).toContain("const indexRoute = route.route('/').meta(pageMeta);");
    expect(routeContent).toContain("const guideRoute = route.route('/guide').meta(guideMeta);");
    expect(routeContent).toContain('export const rootRoute = route;');
    expect(routeContent).toContain('export const rootIndexRoute = indexRoute;');
    expect(routeContent).toContain('export const rootGuideRoute = guideRoute;');
  });

  it('scaffolds root leaf route without layout using .meta()', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/page.mdx': '---\ntitle: Home\n---\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/route.ts');
    expect(routeContent).toContain("import pageMeta from '@airlib-cache/metadata/page.js';");
    expect(routeContent).toContain('const route = router.route().meta(pageMeta);');
    expect(routeContent).toContain('export const rootRoute = route;');
  });

  it('scaffolds top-level grouped route folders with metadata linking', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/(app)/page.mdx': '---\ntitle: App\n---\n',
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/(app)/route.ts');
    expect(routeContent).toContain("import appMeta from '@airlib-cache/metadata/(app)/page.js';");
    expect(routeContent).toContain("const route = router.add('/app').meta(appMeta);");
    expect(routeContent).toContain('export const appRoute = route;');
  });

  it('preserves user-authored .meta() calls and does not inject redundant imports', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/getting-started.page.mdx': '---\ntitle: Getting Started\n---\n',
      'pages/docs/route.ts': [
        "import parentRoute from '../route.js';",
        '',
        '/** AirLib managed */',
        "const route = parentRoute.route('/docs');",
        "const gettingStartedRoute = route.route('/getting-started').meta({ custom: true });",
        '/** AirLib managed */',
        '',
        'export const docsRoute = route;',
        'export const docsGettingStartedRoute = gettingStartedRoute;',
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
    expect(routeContent).not.toContain('@airlib-cache/metadata');
    expect(routeContent).not.toContain('.meta(');
    expect(routeContent).toContain("const route = parentRoute.route('/about');");
    expect(routeContent).toContain('export const aboutRoute = route;');
  });

  it('does not link metadata when linkMetadata is false', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/getting-started.page.mdx': '---\ntitle: Getting Started\n---\n',
    });

    app = makeApp(dir, { linkMetadata: false });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).not.toContain('@airlib-cache/metadata');
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
    expect(routeContent).toContain("import docsIntroMeta from '@airlib-cache/metadata/docs/intro.js';");
    expect(routeContent).toContain("const introRoute = route.route('/intro').meta(docsIntroMeta);");
    expect(routeContent).toContain('export const docsIntroRoute = introRoute;');
  });

  it('gap-fills .meta() onto existing generated declarations for folder, index, and named routes', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/layout.tsx': 'export default () => null;',
      'pages/docs/page.mdx': '---\ntitle: Docs\n---\n',
      'pages/docs/guide.page.mdx': '---\ntitle: Guide\n---\n',
      'pages/docs/route.ts': [
        "import parentRoute from '../route.js';",
        '',
        '/** AirLib managed */',
        "const route = parentRoute.route('/docs');",
        "const indexRoute = route.route('/');",
        "const guideRoute = route.route('/guide');",
        '/** AirLib managed */',
        '',
        'export const docsRoute = route;',
        'export const docsIndexRoute = indexRoute;',
        'export const docsGuideRoute = guideRoute;',
        '',
        'export default docsRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIndexMeta from '@airlib-cache/metadata/docs/page.js';");
    expect(routeContent).toContain("import docsGuideMeta from '@airlib-cache/metadata/docs/guide.js';");
    expect(routeContent).toContain("const indexRoute = route.route('/').meta(docsIndexMeta);");
    expect(routeContent).toContain("const guideRoute = route.route('/guide').meta(docsGuideMeta);");
  });

  it('gap-fills .meta() onto existing generated leaf folder route', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/leaf/page.mdx': '---\ntitle: Leaf\n---\n',
      'pages/leaf/route.ts': [
        "import parentRoute from '../route.js';",
        '',
        '/** AirLib managed */',
        "const route = parentRoute.route('/leaf');",
        '/** AirLib managed */',
        '',
        'export const leafRoute = route;',
        '',
        'export default leafRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    const routeContent = readFixture(dir, 'pages/leaf/route.ts');
    expect(routeContent).toContain("import leafMeta from '@airlib-cache/metadata/leaf/page.js';");
    expect(routeContent).toContain("const route = parentRoute.route('/leaf').meta(leafMeta);");
  });

  it('emits missing index route with .meta() when added mid-run to existing route.ts', () => {
    dir = makeFixture({
      'router.ts': '',
      'pages/docs/layout.tsx': 'export default () => null;',
      'pages/docs/route.ts': [
        "import parentRoute from '../route.js';",
        '',
        '/** AirLib managed */',
        "const route = parentRoute.route('/docs');",
        '/** AirLib managed */',
        '',
        'export const docsRoute = route;',
        '',
        'export default docsRoute;',
      ].join('\n'),
    });

    app = makeApp(dir, { linkMetadata: true });

    writeFixture(dir, {
      'pages/docs/page.mdx': '---\ntitle: Docs Index\n---\n# Index\n',
    });

    app.rootFolder.children.get('docs')?.handleFileAdded('page.mdx');

    const routeContent = readFixture(dir, 'pages/docs/route.ts');
    expect(routeContent).toContain("import docsIndexMeta from '@airlib-cache/metadata/docs/page.js';");
    expect(routeContent).toContain("const indexRoute = route.route('/').meta(docsIndexMeta);");
    expect(routeContent).toContain('export const docsIndexRoute = indexRoute;');
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
    expect(routeContent).toContain("import docsMeta from '@airlib-cache/metadata/docs/page.js';");
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
