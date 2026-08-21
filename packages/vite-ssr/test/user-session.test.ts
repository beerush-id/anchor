import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chokidarState } from './chokidar.js';
import { cleanFixture, fixtureExists, fixturePath, makeFixture, readFixture, removeFixture } from './fixture.js';
import { makeApp, readManifest, readMetadata } from './make-sync.js';

/** One dev session, told as user actions. Starting and stopping the dev server
 *  are actions like any other — there are no test-runner hooks here. The app is
 *  booted in the first step, shared by every step in order, and shut down in
 *  the last step. chokidar is stubbed, so each step writes its files and emits
 *  the watcher events the real watcher would produce — deterministic, with no
 *  real-timer settling or polling. */
describe('one dev session — start, work, stop', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Routes a chokidar event to the watcher owning the file's parent directory. */
  const emit = (ev: string, rel: string) => {
    const abs = fixturePath(dir, rel);
    const watcherDir = path.dirname(abs);
    const watcher = chokidarState.watchers.get(watcherDir) ?? chokidarState.watchers.get(fixturePath(dir, 'pages'));
    watcher?.emit(ev, abs);
  };

  it('the user starts the dev server on a project that has an about page', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '// about\n' });
    app = makeApp(dir);
    app.rootFolder.watch();

    // First boot: the page is a route, listed in the manifest, content untouched.
    expect(readFixture(dir, 'pages/about/route.ts')).toContain('export const aboutRoute = route;');
    expect(readManifest(dir)).toContain("{ path: '/about', route: aboutRoute },");
    expect(readFixture(dir, 'pages/about/page.tsx')).toBe('// about\n');
  });

  it('the user adds a route — a new blogs page', () => {
    fs.mkdirSync(fixturePath(dir, 'pages/blogs'), { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '');
    emit('addDir', 'pages/blogs');
    emit('add', 'pages/blogs/page.tsx');

    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export const blogsRoute = route;');
    expect(readManifest(dir)).toContain("'/blogs'");
    expect(readFixture(dir, 'pages/blogs/page.tsx')).toContain('<h1>Blogs</h1>');
  });

  it('the user adds a child route — a dynamic post page under blogs', () => {
    fs.mkdirSync(fixturePath(dir, 'pages/blogs/[slug]'), { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/[slug]/page.tsx'), '// post\n');
    emit('addDir', 'pages/blogs/[slug]');
    emit('add', 'pages/blogs/[slug]/page.tsx');

    expect(readFixture(dir, 'pages/blogs/[slug]/route.ts')).toContain('export const DynamicRoute = route;');
    expect(readManifest(dir, 'blogs/index.ts')).toContain('/blogs/:slug');
  });

  it('the user adds a docs page and changes its metadata', () => {
    fs.mkdirSync(fixturePath(dir, 'pages/docs'), { recursive: true });
    fs.writeFileSync(fixturePath(dir, 'pages/docs/page.mdx'), '---\ntitle: "Docs"\n---\n# Docs\n');
    emit('addDir', 'pages/docs');
    emit('add', 'pages/docs/page.mdx');

    expect(readMetadata(dir, 'docs/page.ts')).toContain('"title": "Docs"');

    // A real user pauses between creating a file and editing it; the stub
    // watcher establishes the folder watch synchronously on addDir, so the
    // change can follow immediately — no real-timer pause needed.
    fs.writeFileSync(fixturePath(dir, 'pages/docs/page.mdx'), '---\ntitle: "Updated Docs"\n---\n# Docs\n');
    emit('change', 'pages/docs/page.mdx');

    expect(readMetadata(dir, 'docs/page.ts')).toContain('Updated Docs');
  });

  it('the user updates the blogs page content — the write is preserved', () => {
    fs.writeFileSync(fixturePath(dir, 'pages/blogs/page.tsx'), '// final draft\n');
    emit('change', 'pages/blogs/page.tsx');

    expect(readFixture(dir, 'pages/blogs/page.tsx')).toBe('// final draft\n');
    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('blogsRoute');
  });

  it('the user adds a layout to the about page — the index route appears', () => {
    fs.writeFileSync(fixturePath(dir, 'pages/about/layout.tsx'), '// layout\n');
    emit('add', 'pages/about/layout.tsx');

    expect(readFixture(dir, 'pages/about/route.ts')).toContain('aboutIndexRoute');
    expect(readManifest(dir)).toContain('route: aboutIndexRoute');
  });

  it('the user removes the layout — the index route disappears, files stay', () => {
    removeFixture(dir, 'pages/about/layout.tsx');
    emit('unlink', 'pages/about/layout.tsx');

    expect(readFixture(dir, 'pages/about/route.ts')).not.toContain('aboutIndexRoute');
    expect(readManifest(dir)).toContain('route: aboutRoute },');
    expect(readFixture(dir, 'pages/about/page.tsx')).toBe('// about\n');
  });

  it('the user stops the dev server — airlib files are cleaned up, user files remain', () => {
    app?.destroy();
    app = undefined;

    expect(fixtureExists(dir, '.airlib/manifest/index.ts')).toBe(false);
    expect(fixtureExists(dir, '.airlib/metadata/docs/page.ts')).toBe(false);
    expect(fixtureExists(dir, 'pages/about/page.tsx')).toBe(true);
    expect(fixtureExists(dir, 'pages/blogs/[slug]/route.ts')).toBe(true);

    cleanFixture(dir);
  });
});
