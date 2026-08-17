import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanFixture, fixtureExists, fixturePath, makeFixture, readFixture, removeFixture } from './fixture.js';
import { makeApp, readManifest, readMetadata } from './make-sync.js';

/** One dev session, told as user actions. Starting and stopping the dev server
 *  are actions like any other — there are no test-runner hooks here. The app is
 *  booted in the first step, shared by every step in order, and shut down in
 *  the last step. */
describe('one dev session — start, work, stop', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  /** Lets chokidar settle after a mutation before asserting the final state. */
  async function settle(ms = 150): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitFor(cond: () => boolean, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
      if (Date.now() - start > timeout) throw new Error('condition not met in time');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  it('the user starts the dev server on a project that has an about page', async () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '// about\n' });
    app = makeApp(dir);
    app.rootFolder.watch();
    await settle();

    // First boot: the page is a route, listed in the manifest, content untouched.
    expect(readFixture(dir, 'pages/about/route.ts')).toContain("export const aboutRoute = rootRoute.route('/about');");
    expect(readManifest(dir)).toContain("{ path: '/about', route: aboutRoute },");
    expect(readFixture(dir, 'pages/about/page.tsx')).toBe('// about\n');
  });

  it('the user adds a route — a new blogs page', async () => {
    fs.mkdirSync(fixturePath(dir, 'pages/blogs'), { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '');

    await waitFor(() => fixtureExists(dir, 'pages/blogs/route.ts'));
    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain("export const blogsRoute = rootRoute.route('/blogs');");
    await waitFor(() => readManifest(dir).includes("'/blogs'"));
    await waitFor(() => readFixture(dir, 'pages/blogs/page.tsx').includes('<h1>Blogs</h1>'));
  });

  it('the user adds a child route — a dynamic post page under blogs', async () => {
    fs.mkdirSync(fixturePath(dir, 'pages/blogs/[slug]'), { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/[slug]/page.tsx'), '// post\n');

    await waitFor(() => fixtureExists(dir, 'pages/blogs/[slug]/route.ts'));
    expect(readFixture(dir, 'pages/blogs/[slug]/route.ts')).toContain(
      "export const DynamicRoute = blogsRoute.route('/:slug');"
    );
    await waitFor(() => fixtureExists(dir, '.airstack/manifest/blogs/index.ts'));
    await waitFor(() => readManifest(dir, 'blogs/index.ts').includes('/blogs/:slug'));
  });

  // The suite runs many chokidar watchers in parallel; under load the file
  // change event can be delayed well past the ~350ms this takes in isolation.
  // The waitFors below govern delivery — this just keeps vitest's own timeout
  // from preempting them.
  it('the user adds a docs page and changes its metadata', async () => {
    fs.mkdirSync(fixturePath(dir, 'pages/docs'), { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/docs/page.mdx'), '---\ntitle: "Docs"\n---\n# Docs\n');
    await waitFor(() => fixtureExists(dir, '.airstack/metadata/docs/page.ts'));
    expect(readMetadata(dir, 'docs/page.ts')).toContain('"title": "Docs"');

    // A real user pauses between creating a file and editing it; this also gives
    // chokidar time to establish the watch on the new folder before the change.
    await settle(300);
    fs.writeFileSync(fixturePath(dir, 'pages/docs/page.mdx'), '---\ntitle: "Updated Docs"\n---\n# Docs\n');
    await waitFor(() => readMetadata(dir, 'docs/page.ts').includes('Updated Docs'));
  }, 30_000);

  it('the user updates the blogs page content — the write is preserved', async () => {
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '// final draft\n');
    await settle(250);

    expect(readFixture(dir, 'pages/blogs/page.tsx')).toBe('// final draft\n');
    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('blogsRoute');
  });

  it('the user adds a layout to the about page — the index route appears', async () => {
    fs.writeFileSync(fixturePath(dir, 'pages/about/layout.tsx'), '// layout\n');

    await waitFor(() => readFixture(dir, 'pages/about/route.ts').includes('aboutIndexRoute'));
    await waitFor(() => readManifest(dir).includes('route: aboutIndexRoute'));
  });

  it('the user removes the layout — the index route disappears, files stay', async () => {
    removeFixture(dir, 'pages/about/layout.tsx');

    await waitFor(() => !readFixture(dir, 'pages/about/route.ts').includes('aboutIndexRoute'));
    expect(readManifest(dir)).toContain('route: aboutRoute },');
    expect(readFixture(dir, 'pages/about/page.tsx')).toBe('// about\n');
  });

  it('the user stops the dev server — airstack files are cleaned up, user files remain', () => {
    app?.destroy();
    app = undefined;

    expect(fixtureExists(dir, '.airstack/manifest/index.ts')).toBe(false);
    expect(fixtureExists(dir, '.airstack/metadata/docs/page.ts')).toBe(false);
    expect(fixtureExists(dir, 'pages/about/page.tsx')).toBe(true);
    expect(fixtureExists(dir, 'pages/blogs/[slug]/route.ts')).toBe(true);

    cleanFixture(dir);
  });
});
