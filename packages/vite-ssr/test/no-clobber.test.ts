import { afterEach, describe, expect, it } from 'vitest';
import { cleanFixture, fixtureExists, makeFixture, readFixture, removeFixture, writeFixture } from './fixture.js';
import { makeApp } from './make-sync.js';

describe('no-clobber — existing route.ts is never overwritten', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('preserves user wiring in a hand-written route file after boot', () => {
    const custom = "import router from '../router.js';\n\nexport const blogsRoute = router.route('/blogs');\n";

    dir = makeFixture({
      'router.ts': '',
      'pages/blogs/route.ts': custom,
      'pages/blogs/page.tsx': '',
      'pages/blogs/[slug]/page.tsx': '',
      'pages/about/page.tsx': '',
    });

    app = makeApp(dir);

    const content = readFixture(dir, 'pages/blogs/route.ts');
    // The user's lines survive — the assistant only fills the contract.
    expect(content).toContain("import router from '../router.js';");
    expect(content).toContain("export const blogsRoute = router.route('/blogs');");
    // The maintenance contract adds markers + the default export.
    expect(content).toContain('// @generated - do not edit the variable name');
    expect(content).toContain('export default blogsRoute;');
    // The child route.ts is generated since it didn't exist.
    expect(fixtureExists(dir, 'pages/blogs/[slug]/route.ts')).toBe(true);
    expect(fixtureExists(dir, 'pages/about/route.ts')).toBe(true);
  });

  it('keeps custom content the user wrote and fills the contract around it', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);

    // The user overwrites the generated route.ts with custom content.
    // A later structural event fills the contract but never deletes user code.
    writeFixture(dir, { 'pages/blogs/route.ts': '// custom\n' });
    writeFixture(dir, { 'pages/blogs/layout.tsx': '' });
    app.rootFolder.children.get('blogs')?.handleFileAdded('layout.tsx');

    const content = readFixture(dir, 'pages/blogs/route.ts');
    expect(content).toContain('// custom');
    expect(content).toContain('// @generated - do not edit the variable name');
    expect(content).toContain("export const blogsIndexRoute = blogsRoute.route('/');");
  });

  it('does not delete route files when pages are removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    app = makeApp(dir);
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);

    removeFixture(dir, 'pages/blogs/page.tsx');
    app.rootFolder.children.get('blogs')?.handleFileRemoved('page.tsx');

    // The route file stays — it is user-owned now.
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);
  });
});
