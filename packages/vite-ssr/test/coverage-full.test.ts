import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppNode } from '../src/modules/app-node.js';
import { AIR_ENV, DEFAULT_FILE_MAP, detectFramework } from '../src/modules/env.js';
import { FolderNode } from '../src/modules/folder-node.js';
import { ManifestNode } from '../src/modules/manifest.js';
import { mdxEntryWrapper } from '../src/modules/markdown.js';
import { MarkdownNode } from '../src/modules/markdown-node.js';
import { hasChildRoute, isRouteFolder, RouteNode } from '../src/modules/route-node.js';
import type { AnyType } from '../src/types.js';
import { matchFrontmatter, parseFrontmatterBlock } from '../src/utils/frontmatter.js';
import { deriveEntryImport, deriveLayoutImport, deriveRootImport, deriveRouterImport } from '../src/utils/mapper.js';
import {
  hasMarkerAbove,
  isDefaultMarkerComment,
  isManagedMarkerComment,
  markerLineStart,
  parseRouteExports,
} from '../src/utils/route-parser.js';
import { renderRouteFile } from '../src/utils/route-scaffold.js';
import { fillMissingRouteExports } from '../src/utils/route-sync.js';
import { wireUIFileContent } from '../src/utils/route-wiring.js';
import { scaffoldAppTsx, scaffoldForFile, scaffoldLayoutTsx } from '../src/utils/scaffold.js';
import { ensureSymlink } from '../src/utils/sync.js';
import { chokidarState } from './chokidar.js';
import {
  cleanFixture,
  fixtureExists,
  fixturePath,
  makeFixture,
  readFixture,
  removeFixture,
  writeFixture,
} from './fixture.js';
import { makeApp, readMetadata } from './make-sync.js';

const getFrontmatter = (content: string) => parseFrontmatterBlock(matchFrontmatter(content) ?? '');

describe('folder tree — guards and scan resilience', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('skips scanning a missing directory without crashing', () => {
    dir = makeFixture({});
    const folder = new FolderNode(fixturePath(dir, 'does-not-exist'));

    expect(() => folder.scan()).not.toThrow();
    expect(folder.files.size).toBe(0);
    expect(folder.children.size).toBe(0);
  });

  it('never scans hidden folders or node_modules', () => {
    dir = makeFixture({ 'pages/.hidden/page.tsx': '', 'pages/node_modules/page.tsx': '' });

    app = makeApp(dir);

    expect(app.rootFolder.children.has('.hidden')).toBe(false);
    expect(app.rootFolder.children.has('node_modules')).toBe(false);
  });

  it('ignores duplicate file events', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '' });
    app = makeApp(dir);

    const folder = app.rootFolder.children.get('about')!;
    const events: string[] = [];
    folder.on('fileAdded', (name) => events.push(name));

    folder.handleFileAdded('extra.ts');
    folder.handleFileAdded('extra.ts');

    expect(folder.files.has('extra.ts')).toBe(true);
    expect(events).toHaveLength(1);
  });

  it('ignores events for unknown files', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '' });
    app = makeApp(dir);

    const folder = app.rootFolder.children.get('about')!;
    expect(() => folder.handleFileRemoved('ghost.ts')).not.toThrow();
    expect(() => folder.handleFileChanged('ghost.ts')).not.toThrow();
    expect(folder.files.has('ghost.ts')).toBe(false);
  });

  it('ignores duplicate and unknown child events', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '' });
    app = makeApp(dir);

    const root = app.rootFolder;
    const before = root.children.size;
    expect(() => root.handleChildAdded('about', fixturePath(dir, 'pages/about'))).not.toThrow();
    expect(root.children.size).toBe(before);
    expect(() => root.handleChildRemoved('ghost')).not.toThrow();
    expect(root.children.size).toBe(before);
  });

  it('findNode returns undefined outside the tree', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '' });
    app = makeApp(dir);

    expect(app.rootFolder.findNode(fixturePath(dir, 'other'))).toBeUndefined();
    expect(app.rootFolder.findNode(fixturePath(dir, 'pages/about/nope'))).toBeUndefined();
  });
});

describe('watcher events — removals and changes', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  const emit = (ev: string, rel: string) => {
    const abs = fixturePath(dir, rel);
    const watcherDir = path.dirname(abs);
    const watcher = chokidarState.watchers.get(watcherDir) ?? chokidarState.watchers.get(fixturePath(dir, 'pages'));
    watcher?.emit(ev, abs);
  };

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
    chokidarState.watchers.clear();
  });

  it('updates the tree when a watched file is removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
    app = makeApp(dir);
    app.rootFolder.watch();
    emit('ready', '');

    writeFixture(dir, { 'pages/notes/Card.tsx': '// component\n' });
    emit('addDir', 'pages/notes');
    emit('add', 'pages/notes/Card.tsx');
    expect(app?.rootFolder.children.get('notes')?.files.has('Card.tsx')).toBe(true);

    removeFixture(dir, 'pages/notes/Card.tsx');
    emit('unlink', 'pages/notes/Card.tsx');
    expect(app?.rootFolder.children.get('notes')?.files.has('Card.tsx')).toBe(false);
  });

  it('reflects a watched folder removal', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
    app = makeApp(dir);
    app.rootFolder.watch();
    emit('ready', '');

    removeFixture(dir, 'pages/about');
    emit('unlinkDir', 'pages/about');
    expect(app?.rootFolder.children.has('about')).toBe(false);
  });

  it('refreshes generated metadata when a watched mdx file changes', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/guide/page.mdx': '---\ntitle: "Guide"\n---\n# Guide\n' });
    app = makeApp(dir);
    app.rootFolder.watch();
    emit('ready', '');

    writeFixture(dir, { 'pages/guide/page.mdx': '---\ntitle: "Updated Guide"\n---\n# Guide\n' });
    emit('change', 'pages/guide/page.mdx');

    expect(readMetadata(dir, 'guide/page.ts')).toContain('Updated Guide');
  });

  it('notifies listeners when a watched file changes', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
    app = makeApp(dir);
    app.rootFolder.watch();
    emit('ready', '');

    const events: string[] = [];
    app.rootFolder.children.get('about')?.on('fileChanged', (name) => events.push(name));

    emit('change', 'pages/about/page.tsx');

    expect(events).toContain('page.tsx');
  });

  it('notifies listeners when a root-level watched file changes', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/page.tsx': '' });
    app = makeApp(dir);
    app.rootFolder.watch();
    emit('ready', '');

    const events: string[] = [];
    app.rootFolder.on('fileChanged', (name) => events.push(name));

    emit('change', 'pages/page.tsx');

    expect(events).toContain('page.tsx');
  });
});

describe('route generation — resilience', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('boot is safe when a folder directory disappears', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });
    app = makeApp(dir);

    removeFixture(dir, 'pages/blogs');

    expect(() => app!.rootRoute!.children.get('blogs')?.boot()).not.toThrow();
  });

  it('keeps tsx as the page kind when page.mdx is reported after page.tsx', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/docs/page.tsx': '' });
    app = makeApp(dir);
    const route = readFixture(dir, 'pages/docs/route.ts');

    app.rootFolder.children.get('docs')?.handleFileAdded('page.mdx');

    expect(readFixture(dir, 'pages/docs/route.ts')).toBe(route);
    expect(app.rootRoute!.children.get('docs')?.page).toBe('tsx');
  });

  it('falls back to page.mdx when page.tsx is removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/docs/page.tsx': '', 'pages/docs/page.mdx': '' });
    app = makeApp(dir);

    removeFixture(dir, 'pages/docs/page.tsx');
    app.rootFolder.children.get('docs')?.handleFileRemoved('page.tsx');

    expect(app.rootRoute!.children.get('docs')?.page).toBe('mdx');
  });

  it('tolerates an unreadable route file during index injection', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '' });
    app = makeApp(dir);

    const spy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw new Error('mock read failure');
    });

    writeFixture(dir, { 'pages/projects/layout.tsx': '' });
    expect(() => app?.rootFolder.children.get('projects')?.handleFileAdded('layout.tsx')).not.toThrow();

    spy.mockRestore();
    expect(readFixture(dir, 'pages/projects/route.ts')).not.toContain('projectsIndexRoute');
  });

  it('skips index injection when the index export already exists', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '', 'pages/projects/layout.tsx': '' });
    app = makeApp(dir);

    removeFixture(dir, 'pages/projects/layout.tsx');
    app.rootFolder.children.get('projects')?.handleFileRemoved('layout.tsx');

    const spy = vi
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(
        `export const projectsRoute = rootRoute.route('/projects');\nexport const projectsIndexRoute = projectsRoute.route('/');\n` as never
      );

    writeFixture(dir, { 'pages/projects/layout.tsx': '' });
    expect(() => app?.rootFolder.children.get('projects')?.handleFileAdded('layout.tsx')).not.toThrow();

    spy.mockRestore();
  });

  it('tolerates an unreadable route file during index removal', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/projects/page.tsx': '', 'pages/projects/layout.tsx': '' });
    app = makeApp(dir);

    const spy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw new Error('mock read failure');
    });

    removeFixture(dir, 'pages/projects/layout.tsx');
    expect(() => app?.rootFolder.children.get('projects')?.handleFileRemoved('layout.tsx')).not.toThrow();

    spy.mockRestore();
  });

  it('leaves a hand-written route file untouched when the index export is absent', () => {
    const initialRoute = [
      "import parentRoute from '../route.js';",
      '',
      '/** AirLib managed */',
      "const route = parentRoute.route('/blogs');",
      '/** AirLib managed */',
      '',
      'export const blogsRoute = route;',
      '',
      'export default blogsRoute;',
      '',
    ].join('\n');

    dir = makeFixture({
      'router.ts': '',
      'pages/blogs/route.ts': initialRoute,
      'pages/blogs/page.tsx': '',
    });
    app = makeApp(dir);

    app.rootFolder.children.get('blogs')?.handleFileRemoved('layout.tsx');

    expect(readFixture(dir, 'pages/blogs/route.ts')).toBe(initialRoute);
  });
});

describe('manifest — tolerates folders without matching routes', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('boots and ignores removals when a folder has no route child', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });
    const pagesDir = fixturePath(dir, 'pages');

    const folder = new FolderNode(pagesDir);
    folder.scan();

    const route = new RouteNode(folder, undefined, DEFAULT_FILE_MAP, 'react', fixturePath(dir, 'router.ts'));
    route.boot();

    // Diverge the trees: remove the route child while the folder child remains.
    route.children.get('blogs')?.destroy();
    route.children.delete('blogs');

    const manifest = new ManifestNode(route, folder, undefined, dir, DEFAULT_FILE_MAP.route);
    expect(() => manifest.boot()).not.toThrow();

    folder.handleChildRemoved('blogs');

    manifest.destroy();
    route.destroy();
  });
});

describe('mdx & metadata — resilience', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('tolerates a missing mdx file during metadata generation', () => {
    dir = makeFixture({});

    const node = new MarkdownNode(
      fixturePath(dir, 'pages/missing.mdx'),
      fixturePath(dir, 'pages'),
      fixturePath(dir, 'meta')
    );
    expect(() => node.update()).not.toThrow();
    expect(fixtureExists(dir, 'meta/missing.ts')).toBe(false);
  });

  it('falls back to empty metadata for deeply nested frontmatter', () => {
    let recursiveYaml = '---\n';
    for (let i = 0; i < 5000; i++) {
      recursiveYaml += ' '.repeat(i) + 'key:\n';
    }
    recursiveYaml += '---';

    expect(getFrontmatter(recursiveYaml)).toEqual({});
  });

  it('scaffolds layout.mdx with frontmatter', () => {
    dir = makeFixture({ 'pages/docs/layout.mdx': '' });
    app = makeApp(dir);

    const content = scaffoldForFile({
      base: 'layout.mdx',
      folder: app.rootFolder.children.get('docs')!,
      framework: 'react',
      files: DEFAULT_FILE_MAP,
    });
    expect(content).toContain('title: Docs');
    expect(content).toContain('# Docs');
  });
});

describe('symlink — windows platforms', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('uses junction links and absolute targets on win32', () => {
    dir = makeFixture({});

    const symlinkSpy = vi.spyOn(fs, 'symlinkSync').mockImplementation(() => {});
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    try {
      expect(() => ensureSymlink(dir, '.airlib', '@airlib-cache')).not.toThrow();
      expect(symlinkSpy).toHaveBeenCalledWith(
        fixturePath(dir, '.airlib'),
        fixturePath(dir, 'node_modules/@airlib-cache'),
        'junction'
      );
    } finally {
      symlinkSpy.mockRestore();
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
    }
  });

  it('repairs a stale symlink with junction links on win32', () => {
    dir = makeFixture({});

    const target = fixturePath(dir, 'node_modules/@airlib-cache');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(fixturePath(dir, 'wrong-target'), target, 'dir');

    const symlinkSpy = vi.spyOn(fs, 'symlinkSync').mockImplementation(() => {});
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    try {
      expect(() => ensureSymlink(dir, '.airlib', '@airlib-cache')).not.toThrow();
      expect(symlinkSpy).toHaveBeenCalledWith(fixturePath(dir, '.airlib'), target, 'junction');
      expect(symlinkSpy).toHaveBeenCalledTimes(1);
    } finally {
      symlinkSpy.mockRestore();
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
    }
  });
});

describe('folder tree — self-dir events and self-path lookups', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('ignores addDir events for its own directory', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
    app = makeApp(dir);
    app.rootFolder.watch();

    const watcher = (app.rootFolder as AnyType).watcher as { emit: (event: string, path: string) => void };
    expect(watcher).toBeDefined();
    watcher.emit('addDir', app.rootFolder.dir);

    expect(app.rootFolder.children.size).toBe(1);
  });

  it('ignores unlinkDir events for its own directory', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/about/page.tsx': '' });
    app = makeApp(dir);
    app.rootFolder.watch();

    const watcher = (app.rootFolder as AnyType).watcher as { emit: (event: string, path: string) => void };
    watcher.emit('unlinkDir', app.rootFolder.dir);

    expect(app.rootFolder.children.size).toBe(1);
  });

  it('findNode resolves a trailing-separator path to the folder itself', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '' });
    app = makeApp(dir);

    const root = app.rootFolder;
    expect(root.findNode(`${root.dir}${path.sep}`)).toBe(root);
  });
});

describe('route node — mdx-first adoption and root index lifecycle', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('adopts page.mdx as the page kind when a pageless folder gains an mdx page', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/data.ts': '' });
    app = makeApp(dir);

    const blogs = app.rootFolder.children.get('blogs')!;
    expect(app.rootRoute!.children.get('blogs')?.page).toBeUndefined();

    const events: string[] = [];
    app.rootRoute!.children.get('blogs')?.on('change', (_file, kind) => events.push(kind));

    writeFixture(dir, { 'pages/blogs/page.mdx': '' });
    blogs.handleFileAdded('page.mdx');

    expect(app.rootRoute!.children.get('blogs')?.page).toBe('mdx');
    expect(readFixture(dir, 'pages/blogs/route.ts')).toContain('export const blogsRoute = route;');
    expect(events).toContain('reload');
  });

  it('scaffolds nothing when the framework is unknown', () => {
    vi.useFakeTimers();
    try {
      dir = makeFixture({ 'pages/page.tsx': '' });
      const folder = new FolderNode(fixturePath(dir, 'pages'));
      folder.scan();
      const route = new RouteNode(
        folder,
        undefined,
        DEFAULT_FILE_MAP,
        undefined as never,
        fixturePath(dir, 'router.ts')
      );
      route.boot();
      vi.advanceTimersByTime(100);
      expect(readFixture(dir, 'pages/page.tsx')).toBe('');
      route.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('injects the index export when a page lands on a root with a layout', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/layout.tsx': '' });
    app = makeApp(dir);

    writeFixture(dir, { 'pages/page.tsx': '' });
    app.rootFolder.handleFileAdded('page.tsx');

    expect(readFixture(dir, 'pages/route.ts')).toContain('export const rootIndexRoute = indexRoute;');
  });

  it('removes the root index export when the root layout disappears', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/page.tsx': '', 'pages/layout.tsx': '' });
    app = makeApp(dir);

    expect(readFixture(dir, 'pages/route.ts')).toContain('export const rootIndexRoute = indexRoute;');

    removeFixture(dir, 'pages/layout.tsx');
    app.rootFolder.handleFileRemoved('layout.tsx');

    expect(readFixture(dir, 'pages/route.ts')).not.toContain('export const rootIndexRoute');
  });
});

describe('scaffold — unknown files and folder-shape edge cases', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('returns no scaffold for unknown file types', () => {
    dir = makeFixture({ 'pages/about/page.tsx': '' });
    app = makeApp(dir);

    const content = scaffoldForFile({
      base: 'notes.tsx',
      folder: app.rootFolder.children.get('about')!,
      framework: 'react',
      files: DEFAULT_FILE_MAP,
    });
    expect(content).toBeUndefined();
  });

  it('scaffolds a page into a folder that only has an mdx page', () => {
    dir = makeFixture({ 'pages/guide/page.mdx': '' });
    app = makeApp(dir);

    const content = scaffoldForFile({
      base: 'page.tsx',
      folder: app.rootFolder.children.get('guide')!,
      framework: 'react',
      files: DEFAULT_FILE_MAP,
    });
    expect(content).toContain('guideRoute');
  });

  it('scaffolds a page into a folder that only has an mdx layout', () => {
    dir = makeFixture({ 'pages/guide/layout.mdx': '' });
    app = makeApp(dir);

    const content = scaffoldForFile({
      base: 'page.tsx',
      folder: app.rootFolder.children.get('guide')!,
      framework: 'react',
      files: DEFAULT_FILE_MAP,
    });
    expect(content).toContain('guideRoute');
  });

  it('scaffolds a root page from an mdx-only root', () => {
    dir = makeFixture({ 'pages/page.mdx': '' });
    app = makeApp(dir);

    const content = scaffoldForFile({
      base: 'page.tsx',
      folder: app.rootFolder,
      framework: 'react',
      files: DEFAULT_FILE_MAP,
    });
    expect(content).toContain('rootRoute');
  });
});

describe('metadata — event and cleanup edge cases', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  it('ignores removals of unknown child folders', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/guide/page.mdx': '---\ntitle: Guide\n---\n' });
    app = makeApp(dir);

    const ghost = new FolderNode(fixturePath(dir, 'pages/ghost'), app.rootFolder);
    expect(() => app?.rootFolder.emit('childRemoved', ghost)).not.toThrow();
    expect(app?.rootMetadata?.children.size).toBe(1);
  });

  it('ignores duplicate mdx add events', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/guide/page.mdx': '---\ntitle: Guide\n---\n' });
    app = makeApp(dir);

    const guide = app.rootFolder.children.get('guide')!;
    const pageMetaBefore = readMetadata(dir, 'guide/page.ts');

    guide.emit('fileAdded', 'page.mdx');

    expect(readMetadata(dir, 'guide/page.ts')).toBe(pageMetaBefore);
  });

  it('tolerates an unlink failure while pruning an empty metadata index', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/empty/placeholder.txt': '' });
    fs.mkdirSync(fixturePath(dir, '.airlib/metadata/empty/index.ts'), { recursive: true });

    app = makeApp(dir);

    const stat = fs.statSync(fixturePath(dir, '.airlib/metadata/empty/index.ts'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('tolerates an unlink failure while destroying a metadata node', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/guide/page.mdx': '---\ntitle: Guide\n---\n' });
    app = makeApp(dir);

    removeFixture(dir, '.airlib/metadata/guide/index.ts');
    fs.mkdirSync(fixturePath(dir, '.airlib/metadata/guide/index.ts'), { recursive: true });

    expect(() => app?.destroy()).not.toThrow();
  });

  it('prunes the metadata index when the last markdown file is removed', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/guide/page.mdx': '---\ntitle: Guide\n---\n' });
    app = makeApp(dir);

    expect(fixtureExists(dir, '.airlib/metadata/guide/index.ts')).toBe(true);

    removeFixture(dir, 'pages/guide/page.mdx');
    app.rootFolder.children.get('guide')?.handleFileRemoved('page.mdx');

    expect(fixtureExists(dir, '.airlib/metadata/guide/index.ts')).toBe(false);
  });
});

describe('manifest — cleanup edge cases', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  it('tolerates an unlink failure while destroying a manifest node', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/blogs/page.tsx': '' });
    const pagesDir = fixturePath(dir, 'pages');

    const folder = new FolderNode(pagesDir);
    folder.scan();

    const route = new RouteNode(folder, undefined, DEFAULT_FILE_MAP, 'react', fixturePath(dir, 'router.ts'));
    route.boot();

    const manifest = new ManifestNode(route, folder, undefined, dir, DEFAULT_FILE_MAP.route);
    manifest.boot();

    const blogsManifest = manifest.children.get('blogs')!;
    removeFixture(dir, '.airlib/manifest/blogs/index.ts');
    fs.mkdirSync(fixturePath(dir, '.airlib/manifest/blogs/index.ts'), { recursive: true });

    expect(() => blogsManifest.destroy()).not.toThrow();
    expect(fixtureExists(dir, '.airlib/manifest/blogs')).toBe(true);

    manifest.destroy();
    route.destroy();
  });
});

describe('mdx attach & metadata names — edge cases', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  function wrap(file: string, framework: 'react' | 'solid' = 'react') {
    const resolution = AIR_ENV.routes.resolve(fixturePath(dir, file));
    if (!resolution) return undefined;
    return mdxEntryWrapper({
      file: fixturePath(dir, file),
      route: resolution,
      framework,
      files: DEFAULT_FILE_MAP,
      chunkName: './page.mdx?chunk',
    });
  }

  it('declines non-mdx files', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/page.tsx': '' });
    app = makeApp(dir);

    expect(wrap('pages/page.tsx')).toBeUndefined();
  });

  it('declines mdx files outside the pages directory', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/page.mdx': '' });
    app = makeApp(dir);

    expect(wrap('assets/page.mdx')).toBeUndefined();
  });

  it('declines page.mdx when page.tsx already owns the folder', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/docs/page.tsx': '', 'pages/docs/page.mdx': '' });
    app = makeApp(dir);

    expect(wrap('pages/docs/page.mdx')).toBeUndefined();
  });

  it('attaches a root layout.mdx to rootRoute', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/layout.mdx': '' });
    app = makeApp(dir);

    expect(wrap('pages/layout.mdx')).toContain("import { rootRoute as __airRoute } from './route.ts';");
  });

  it('attaches a nested layout.mdx to its folder route', () => {
    dir = makeFixture({ 'router.ts': '', 'pages/docs/layout.mdx': '' });
    app = makeApp(dir);

    expect(wrap('pages/docs/layout.mdx')).toContain("import { docsRoute as __airRoute } from './route.ts';");
  });

  it('names symbol-only metadata modules with the root prefix', () => {
    dir = makeFixture({});

    const node = new MarkdownNode(
      fixturePath(dir, 'pages/--.mdx'),
      fixturePath(dir, 'pages'),
      fixturePath(dir, 'meta')
    );
    expect(node.varName).toBe('rootMeta');
  });

  it('detects react framework when @airlib/react is present in package.json', () => {
    dir = makeFixture({
      'package.json': JSON.stringify({ dependencies: { '@airlib/react': '^1.0.0' } }),
    });
    expect(detectFramework(dir)).toBe('react');
  });

  it('scaffolds named MDX pages with frontmatter', () => {
    dir = makeFixture({});
    const folder = new FolderNode(fixturePath(dir, 'pages/docs'));
    expect(
      scaffoldForFile({
        base: 'guide.page.mdx',
        folder,
        framework: 'react',
        files: DEFAULT_FILE_MAP,
      })
    ).toContain('title: Guide');
  });

  it('evaluates marker comment helpers in route-parser correctly', () => {
    expect(hasMarkerAbove('/** @generated */\nexport default route;', 18, '/** @generated */')).toBe(true);
    expect(markerLineStart('/** @generated */\nexport default route;', 18)).toBe(0);
    expect(markerLineStart('const x = 1;\nexport default route;', 13)).toBeUndefined();
    expect(isDefaultMarkerComment('@generated - do not edit')).toBe(true);
    expect(isManagedMarkerComment('/* AirLib managed */')).toBe(true);

    const parsed = parseRouteExports('/* AirLib managed */\nconst x = 1;');
    expect(parsed?.managedBlock).toBeDefined();
    expect(parsed?.managedBlock?.start).toBe(0);
  });

  it('scaffolds root named page and layout without explicit routeExport', () => {
    dir = makeFixture({});
    const rootFolder = new FolderNode(fixturePath(dir, 'pages'));
    expect(
      scaffoldForFile({
        base: 'v1.page.tsx',
        folder: rootFolder,
        framework: 'react',
        files: DEFAULT_FILE_MAP,
      })
    ).toContain('export default page(rootV1Route)');

    expect(
      scaffoldLayoutTsx({
        framework: 'react',
        rel: 'docs',
        files: DEFAULT_FILE_MAP,
      })
    ).toContain('import docsRoute from');

    expect(
      scaffoldLayoutTsx({
        framework: 'react',
        rel: '',
        files: DEFAULT_FILE_MAP,
      })
    ).toContain('import rootRoute from');
  });

  it('scaffolds app files when appDir and pagesDir are root', () => {
    dir = makeFixture({});
    new AppNode({
      root: dir,
      appDir: dir,
      pagesDir: dir,
      routerFile: fixturePath(dir, 'router.ts'),
      framework: 'react',
      fileMap: DEFAULT_FILE_MAP,
    });

    expect(fixtureExists(dir, 'app.tsx')).toBe(true);
    expect(fixtureExists(dir, 'client.tsx')).toBe(true);
    expect(fixtureExists(dir, 'worker.ts')).toBe(true);
  });

  it('covers parser and scaffold branch edge cases', () => {
    const parsed = parseRouteExports('export let x;\nlet y;');
    expect(parsed?.declarations.length).toBe(2);
    expect(parsed?.declarations[0].initText).toBeUndefined();
    expect(parsed?.declarations[1].initText).toBeUndefined();

    const appCode = scaffoldAppTsx({ framework: 'react' });
    expect(appCode).toContain("from '@/pages/layout.js'");
    expect(appCode).toContain("from '@/src/router.js'");

    const bareLayoutCode = scaffoldLayoutTsx({
      framework: 'react',
      files: DEFAULT_FILE_MAP,
    });
    expect(bareLayoutCode).toContain('import rootRoute from');

    const emptyRelLayoutCode = scaffoldLayoutTsx({
      framework: 'react',
      rel: '',
      files: DEFAULT_FILE_MAP,
    });
    expect(emptyRelLayoutCode).toContain('import rootRoute from');

    const trailingSlashRelLayoutCode = scaffoldLayoutTsx({
      framework: 'react',
      rel: 'docs/',
      files: DEFAULT_FILE_MAP,
    });
    expect(trailingSlashRelLayoutCode).toContain('import rootRoute from');

    const customExportLayoutCode = scaffoldLayoutTsx({
      framework: 'react',
      routeExport: 'customDocsRoute',
      files: DEFAULT_FILE_MAP,
    });
    expect(customExportLayoutCode).toContain('import customDocsRoute from');
  });

  it('covers wiring keepDefault branch when default import does not match page binding', () => {
    const wired = wireUIFileContent({
      content: "import otherDefault, { docsRoute } from './route.ts';\nexport default page(docsRoute);",
      filePath: '/src/pages/docs/page.tsx',
      displayPath: 'pages/docs/page.tsx',
      targetRouteName: 'docsIndexRoute',
      routeName: 'docsRoute',
      routeFileName: 'route.ts',
      name: 'page.tsx',
    });

    expect(wired?.changed).toBe(true);
    expect(wired?.output).toContain("import otherDefault, { docsIndexRoute, docsRoute } from './route.ts';");
  });

  it('covers sync route pruning and export fallback branches', () => {
    const eofResult = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\nconst indexRoute = route.route('/');\n/** AirLib managed */",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: false,
      resolveMetadataImport: () => ({ varName: '', source: '' }),
    });

    expect(eofResult?.changed).toBe(true);
    expect(eofResult?.output).not.toContain('const indexRoute');

    const eofNoNewlineResult = fillMissingRouteExports({
      content:
        "/** AirLib managed */\nconst route = router.route('/docs');\nconst indexRoute = route.route('/');/** AirLib managed */",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: false,
      resolveMetadataImport: () => ({ varName: '', source: '' }),
    });

    expect(eofNoNewlineResult?.changed).toBe(true);

    const staleNamedResult = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\nconst guideRoute = route.route('/guide');\n/** AirLib managed */",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: false,
      resolveMetadataImport: () => ({ varName: '', source: '' }),
    });

    expect(staleNamedResult?.changed).toBe(true);
    expect(staleNamedResult?.output).not.toContain('const guideRoute');

    const staleNamedNoNewline = fillMissingRouteExports({
      content:
        "/** AirLib managed */\nconst route = router.route('/docs');\nconst oldRoute = route.route('/old');/** AirLib managed */",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: false,
      resolveMetadataImport: () => ({ varName: '', source: '' }),
    });

    expect(staleNamedNoNewline?.changed).toBe(true);

    const routeAliasPrune = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport const docsIndexRoute = route;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: false,
      resolveMetadataImport: () => ({ varName: '', source: '' }),
    });

    expect(routeAliasPrune?.changed).toBe(true);
    expect(routeAliasPrune?.output).not.toContain('export const docsIndexRoute = route;');

    const customExportDefault = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\n/** AirLib managed */\n\nexport const customDocsRoute = route;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: false,
      resolveMetadataImport: () => ({ varName: '', source: '' }),
    });

    expect(customExportDefault?.changed).toBe(true);
    expect(customExportDefault?.output).toContain('export default customDocsRoute;');

    const exportedNamedMdx = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport const docsGuideRoute = route.route('/guide');\nexport default docsRoute;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(['guide.page.mdx']),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: true,
      resolveMetadataImport: () => ({ varName: 'guideMeta', source: './guide.meta.js' }),
    });

    expect(exportedNamedMdx?.changed).toBe(true);
    expect(exportedNamedMdx?.output).toContain('import guideMeta from');

    const localNamedMdx = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\nconst guideRoute = route.route('/guide');\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport default docsRoute;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(['guide.page.mdx']),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: true,
      resolveMetadataImport: () => ({ varName: 'guideMeta', source: './guide.meta.js' }),
    });

    expect(localNamedMdx?.changed).toBe(true);
    expect(localNamedMdx?.output).toContain("const guideRoute = route.route('/guide').meta(guideMeta);");

    const alreadyHasMetaMdx = fillMissingRouteExports({
      content:
        "import guideMeta from './guide.meta.js';\nimport rootRoute from '../route.js';\n\n/** AirLib managed */\nconst route = rootRoute.route('/docs');\nconst guideRoute = route.route('/guide').meta(guideMeta);\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport const docsGuideRoute = guideRoute;\nexport default docsRoute;\n",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: '/src/pages/route.ts',
      parentRouteName: 'rootRoute',
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: false,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(['guide.page.mdx']),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: true,
      resolveMetadataImport: () => ({ varName: 'guideMeta', source: './guide.meta.js' }),
    });

    expect(alreadyHasMetaMdx).toBeDefined();

    const exportedLocalNameMdx = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport const guideRoute = route.route('/guide');\nexport default docsRoute;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(['guide.page.mdx']),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: true,
      resolveMetadataImport: () => ({ varName: 'guideMeta', source: './guide.meta.js' }),
    });

    expect(exportedLocalNameMdx?.changed).toBe(true);

    const localNamedRouteNameMdx = fillMissingRouteExports({
      content:
        "import rootRoute from '../route.js';\n\n/** AirLib managed */\nconst route = rootRoute.route('/docs');\nconst docsGuideRoute = route.route('/guide');\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport default docsRoute;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: '/src/pages/route.ts',
      parentRouteName: 'rootRoute',
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: false,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(['guide.page.mdx']),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: true,
      resolveMetadataImport: () => ({ varName: 'guideMeta', source: './guide.meta.js' }),
    });

    expect(localNamedRouteNameMdx?.changed).toBe(true);

    const bothExportedNamedMdx = fillMissingRouteExports({
      content:
        "import router from '../../router.ts';\n\n/** AirLib managed */\nconst route = router.route('/docs');\n/** AirLib managed */\n\nexport const docsRoute = route;\nexport const guideRoute = route.route('/guide');\nexport const rootGuideRoute = route.route('/guide');\nexport default docsRoute;",
      routeFilePath: '/src/pages/docs/route.ts',
      parentRouteFile: undefined,
      parentRouteName: undefined,
      routeName: 'docsRoute',
      indexName: 'docsIndexRoute',
      isTopLevel: true,
      pageKind: undefined,
      hasLayout: false,
      namedPages: new Set(['guide.page.mdx']),
      fileMap: DEFAULT_FILE_MAP,
      displayPath: 'pages/docs/route.ts',
      folderSegment: 'docs',
      linkMetadata: true,
      resolveMetadataImport: () => ({ varName: 'guideMeta', source: './guide.meta.js' }),
    });

    expect(bothExportedNamedMdx?.changed).toBe(true);
  });

  it('derives router import using AIR_ENV rootAlias and srcDir', () => {
    const defaultImport = deriveRouterImport();
    expect(defaultImport).toBe('@/src/router.js');

    const customEnv = {
      ...AIR_ENV,
      rootAlias: '$',
      srcDir: 'app',
      files: { ...DEFAULT_FILE_MAP, router: 'routes.ts' },
    };
    expect(deriveRouterImport(customEnv)).toBe('$/app/routes.js');

    const emptySrcEnv = {
      ...AIR_ENV,
      rootAlias: '~',
      srcDir: '',
      files: { ...DEFAULT_FILE_MAP, router: 'router.ts' },
    };
    expect(deriveRouterImport(emptySrcEnv)).toBe('~/router.js');
  });

  it('derives root, layout, and entry imports from environment without magic strings', () => {
    expect(deriveRootImport('pages/blogs/route.ts')).toBe('@/pages/blogs/route.js');
    expect(deriveLayoutImport()).toBe('@/pages/layout.js');
    expect(deriveEntryImport()).toBe('@/src/app.js');

    const customEnv = {
      ...AIR_ENV,
      rootAlias: '$',
      srcDir: 'src_custom',
      pagesDir: 'routes_custom',
      files: {
        ...DEFAULT_FILE_MAP,
        layout: 'root.layout.tsx',
        entry: 'main.tsx',
      },
    };

    expect(deriveRootImport('routes_custom/blogs/route.ts', customEnv)).toBe('$/routes_custom/blogs/route.js');
    expect(deriveLayoutImport(customEnv)).toBe('$/routes_custom/root.layout.js');
    expect(deriveEntryImport(customEnv)).toBe('$/src_custom/main.js');

    const emptyEnv = {
      ...AIR_ENV,
      rootAlias: '~',
      srcDir: '',
      pagesDir: '',
      files: DEFAULT_FILE_MAP,
    };
    expect(deriveLayoutImport(emptyEnv)).toBe('~/layout.js');
    expect(deriveEntryImport(emptyEnv)).toBe('~/app.js');
  });

  it('renders route file with alias-based router import', () => {
    const output = renderRouteFile({
      routeFilePath: '/test/pages/route.ts',
      routerFile: '/test/src/router.ts',
      routeName: 'rootRoute',
      indexName: 'rootIndexRoute',
      routePath: '/',
      isTopLevel: false,
      hasPage: true,
      hasLayout: true,
      metaImports: [],
      namedPages: [],
    });

    expect(output).toContain("import router from '@/src/router.js';");
    expect(output).toContain('export const rootRoute = route;');
    expect(output).toContain('export const rootIndexRoute = indexRoute;');
  });

  it('detects route folders with named pages or descendant routes', () => {
    const root = new FolderNode('/test/pages');
    const child = new FolderNode('/test/pages/sub', root);
    root.children.set('sub', child);
    child.files.add('custom.page.tsx');

    expect(isRouteFolder(child, DEFAULT_FILE_MAP)).toBe(true);
    expect(hasChildRoute(root, DEFAULT_FILE_MAP)).toBe(true);

    const emptyRoot = new FolderNode('/test/pages');
    const nonRouteChild = new FolderNode('/test/pages/components', emptyRoot);
    emptyRoot.children.set('components', nonRouteChild);
    nonRouteChild.files.add('Button.tsx');
    expect(isRouteFolder(emptyRoot, DEFAULT_FILE_MAP)).toBe(false);

    const deepRoot = new FolderNode('/test/pages');
    const midFolder = new FolderNode('/test/pages/nested', deepRoot);
    const leafFolder = new FolderNode('/test/pages/nested/leaf', midFolder);
    deepRoot.children.set('nested', midFolder);
    midFolder.children.set('leaf', leafFolder);
    leafFolder.files.add('page.tsx');
    expect(isRouteFolder(deepRoot, DEFAULT_FILE_MAP)).toBe(true);
  });

  it('scaffolds parent layout when page.tsx is added to a folder that already has child routes', () => {
    const dir = makeFixture({
      'router.ts': '',
      'pages/blogs/[slug]/page.tsx': '',
    });
    const app = makeApp(dir);

    writeFixture(dir, {
      'pages/blogs/page.tsx': '',
    });
    const blogsFolder = app.rootFolder.children.get('blogs')!;
    blogsFolder.handleFileAdded('page.tsx');

    expect(fixtureExists(dir, 'pages/blogs/layout.tsx')).toBe(true);
    app.destroy();
    cleanFixture(dir);
  });

  it('scaffolds parent layout when a child folder with route files is added dynamically', () => {
    const dir = makeFixture({
      'router.ts': '',
      'pages/parent/page.tsx': '',
    });
    const app = makeApp(dir);

    const parentFolder = app.rootFolder.children.get('parent')!;
    writeFixture(dir, {
      'pages/parent/child/page.tsx': '',
    });

    const childFolder = new FolderNode(fixturePath(dir, 'pages/parent/child'), parentFolder);
    childFolder.scan();
    parentFolder.children.set('child', childFolder);

    parentFolder.emit('childAdded', childFolder);

    expect(fixtureExists(dir, 'pages/parent/layout.tsx')).toBe(true);
    app.destroy();
    cleanFixture(dir);
  });

  it('updates state and notifies parent when route.ts is added dynamically', () => {
    const dir = makeFixture({
      'router.ts': '',
      'pages/parent/page.tsx': '',
      'pages/parent/child/something.txt': '',
    });
    const app = makeApp(dir);

    writeFixture(dir, {
      'pages/parent/child/route.ts': "import parentRoute from '../route.js';\nexport default parentRoute.route('/child');",
    });

    const childFolder = app.rootFolder.children.get('parent')!.children.get('child')!;
    childFolder.handleFileAdded('route.ts');

    expect(fixtureExists(dir, 'pages/parent/layout.tsx')).toBe(true);
    app.destroy();
    cleanFixture(dir);
  });
});
