import { afterEach, describe, expect, it } from 'vitest';
import { cleanFixture, fixtureExists, makeFixture, readFixture, removeFixture, writeFixture } from './fixture.js';
import { makeSync } from './make-sync.js';

describe('no-clobber — existing route.ts is never overwritten', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('leaves a hand-written route file byte-identical after refresh', () => {
    const custom = "import router from '../router.js';\n\nexport const blogsRoute = router.route('/blogs');\n";

    dir = makeFixture({
      'router.ts': '',
      'pages/blogs/route.ts': custom,
      'pages/blogs/page.tsx': '',
      'pages/blogs/[slug]/page.tsx': '',
      'pages/about/page.tsx': '',
    });

    const { sync } = makeSync(dir);
    sync.refresh();

    expect(readFixture(dir, 'pages/blogs/route.ts')).toBe(custom);
    // Child route.ts is generated since it didn't exist
    expect(fixtureExists(dir, 'pages/blogs/[slug]/route.ts')).toBe(true);
    expect(fixtureExists(dir, 'pages/about/route.ts')).toBe(true);
  });

  it('keeps a route file the user replaced with custom content', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);

    // The user overwrites the generated route.ts with custom content.
    // On next refresh, it must not be touched.
    writeFixture(dir, { 'pages/blogs/route.ts': '// custom\n' });
    sync.refresh();

    expect(readFixture(dir, 'pages/blogs/route.ts')).toBe('// custom\n');
  });

  it('does not delete route files when pages are removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });

    const { sync } = makeSync(dir);
    sync.refresh();
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);

    removeFixture(dir, 'pages/blogs/page.tsx');
    sync.refresh();

    // Route file stays — it's user-owned
    expect(fixtureExists(dir, 'pages/blogs/route.ts')).toBe(true);
  });
});
