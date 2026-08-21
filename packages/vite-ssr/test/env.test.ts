import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIR_ENV, detectFramework, initEnv } from '../src/modules/env.js';
import { airEnvConfig } from '../src/plugins/env.js';
import { airImage } from '../src/plugins/image.js';
import { airMarkdown } from '../src/plugins/markdown.js';
import { airPages } from '../src/plugins/pages.js';
import { airPreprocess } from '../src/plugins/preprocess.js';
import { airSearch } from '../src/plugins/search.js';
import { DEFAULT_FILE_MAP } from '../src/utils/mapper.js';
import { airWorker, resolveWorkerEntry } from '../src/worker.js';
import { cleanFixture, fixturePath, makeFixture, readFixture } from './fixture.js';
import { makeApp } from './make-sync.js';

describe('environment & configuration lifecycle', () => {
  let dir = '';
  let app: ReturnType<typeof makeApp> | undefined;

  beforeEach(() => {
    // Reset AIR_ENV to baseline defaults before each test
    AIR_ENV.viteRoot = '';
    AIR_ENV.srcDir = 'src';
    AIR_ENV.pagesDir = 'pages';
    AIR_ENV.cacheDir = '.airlib';
    AIR_ENV.cacheScope = '@airlib-cache';
    AIR_ENV.framework = 'react';
    AIR_ENV.files = { ...DEFAULT_FILE_MAP };
    AIR_ENV.linkMetadata = false;
  });

  afterEach(() => {
    app?.destroy();
    cleanFixture(dir);
  });

  describe('initEnv — merging & idempotency', () => {
    it('sets viteRoot from config and defaults to react when no framework detected', () => {
      dir = makeFixture({});
      initEnv({ root: dir } as never);

      expect(AIR_ENV.viteRoot).toBe(dir);
      expect(AIR_ENV.framework).toBe('react');
      expect(AIR_ENV.srcDir).toBe('src');
      expect(AIR_ENV.pagesDir).toBe('pages');
      expect(AIR_ENV.cacheDir).toBe('.airlib');
      expect(AIR_ENV.cacheScope).toBe('@airlib-cache');
    });

    it('detects solid framework from package.json dependencies', () => {
      dir = makeFixture({
        'package.json': JSON.stringify({
          dependencies: {
            '@airlib/solid': '^0.1.0',
          },
        }),
      });

      expect(detectFramework(dir)).toBe('solid');

      initEnv({ root: dir } as never);
      expect(AIR_ENV.framework).toBe('solid');
    });

    it('respects explicit framework override over package.json auto-detection', () => {
      dir = makeFixture({
        'package.json': JSON.stringify({
          dependencies: {
            '@airlib/solid': '^0.1.0',
          },
        }),
      });

      initEnv({ root: dir } as never, { framework: 'react' });
      expect(AIR_ENV.framework).toBe('react');
    });

    it('preserves overrides across multiple sequential initEnv calls', () => {
      dir = makeFixture({});

      initEnv({ root: dir } as never, {
        srcDir: 'app',
        pagesDir: 'routes',
        cacheDir: '.custom-cache',
        cacheScope: '@custom-scope',
      });

      expect(AIR_ENV.srcDir).toBe('app');
      expect(AIR_ENV.pagesDir).toBe('routes');
      expect(AIR_ENV.cacheDir).toBe('.custom-cache');
      expect(AIR_ENV.cacheScope).toBe('@custom-scope');

      // Subsequent call without overrides must not reset previously configured values
      initEnv({ root: dir } as never);

      expect(AIR_ENV.srcDir).toBe('app');
      expect(AIR_ENV.pagesDir).toBe('routes');
      expect(AIR_ENV.cacheDir).toBe('.custom-cache');
      expect(AIR_ENV.cacheScope).toBe('@custom-scope');
    });
  });

  describe('airEnvConfig — alias helper', () => {
    it('returns @ alias mapped to the provided project root', () => {
      const config = airEnvConfig('/path/to/my-project');
      expect(config.resolve?.alias).toEqual({
        '@': '/path/to/my-project',
      });
    });
  });

  describe('standalone plugin lifecycle — each initializes AIR_ENV independently', () => {
    it('airMarkdown initializes AIR_ENV in configResolved', () => {
      dir = makeFixture({});
      const plugins = airMarkdown();
      const initPlugin = plugins.find(
        (p) => p && typeof p === 'object' && 'name' in p && p.name === 'air-pages:mdx:init'
      ) as { configResolved?: (config: unknown) => void } | undefined;

      expect(initPlugin).toBeDefined();
      initPlugin?.configResolved?.({ root: dir });

      expect(AIR_ENV.viteRoot).toBe(dir);
    });

    it('airPreprocess initializes AIR_ENV in configResolved', () => {
      dir = makeFixture({});
      const plugins = airPreprocess();
      const prepPlugin = plugins[0] as { configResolved?: (config: unknown) => void } | undefined;

      prepPlugin?.configResolved?.({ root: dir });

      expect(AIR_ENV.viteRoot).toBe(dir);
    });

    it('airSearch initializes AIR_ENV and accepts pagesDir override', () => {
      dir = makeFixture({ 'custom-pages/page.mdx': '# Test\n' });
      const searchPlugin = airSearch({ pagesDir: 'custom-pages' }) as {
        configResolved?: (config: unknown) => void;
      };

      searchPlugin.configResolved?.({ root: dir });

      expect(AIR_ENV.viteRoot).toBe(dir);
      expect(AIR_ENV.pagesDir).toBe('custom-pages');
    });

    it('airImage initializes AIR_ENV and image store', () => {
      dir = makeFixture({});
      const imagePlugin = airImage() as { configResolved?: (config: unknown) => void };

      imagePlugin.configResolved?.({ root: dir, command: 'serve' });

      expect(AIR_ENV.viteRoot).toBe(dir);
      expect(AIR_ENV.images).toBeDefined();
    });

    it('airWorker initializes AIR_ENV in configResolved and resolves worker entry', () => {
      dir = makeFixture({});
      const workerPlugin = airWorker() as { configResolved?: (config: unknown) => void };

      workerPlugin.configResolved?.({ root: dir, build: { ssr: false } });

      expect(AIR_ENV.viteRoot).toBe(dir);
      expect(resolveWorkerEntry({})).toBe('src/worker.ts');

      AIR_ENV.srcDir = 'app';
      expect(resolveWorkerEntry({})).toBe('app/worker.ts');
    });

    it('airPages config hook injects @ alias and cacheScope optimization excludes', () => {
      dir = makeFixture({});
      const pluginOption = airPages({
        srcDir: 'app',
        pagesDir: 'routes',
        cacheDir: '.my-cache',
        cacheScope: '@my-scope',
      });

      const plugins = Array.isArray(pluginOption) ? pluginOption : [pluginOption];
      const core = plugins.find((p) => p && typeof p === 'object' && 'name' in p && p.name === 'air-pages') as {
        config?: (userConfig: { root?: string }) => {
          resolve?: { alias?: Record<string, string> };
          optimizeDeps?: { exclude?: string[] };
          ssr?: { noExternal?: string[] };
        };
        configResolved?: (config: { root: string }) => void;
      };

      expect(core).toBeDefined();

      const userConfig = { root: dir };
      const returnedConfig = core.config?.(userConfig);

      expect(returnedConfig?.resolve?.alias?.['@']).toBe(dir);
      expect(returnedConfig?.optimizeDeps?.exclude).toContain('@airlib-cache/manifest');
      expect(returnedConfig?.ssr?.noExternal).toContain('@airlib-cache/metadata');

      core.configResolved?.({ root: dir });

      expect(AIR_ENV.srcDir).toBe('app');
      expect(AIR_ENV.pagesDir).toBe('routes');
      expect(AIR_ENV.cacheDir).toBe('.my-cache');
      expect(AIR_ENV.cacheScope).toBe('@my-scope');
    });
  });

  describe('custom cacheDir and cacheScope in domain nodes', () => {
    it('manifest node uses configured cacheDir and cacheScope', () => {
      dir = makeFixture({ 'pages/page.tsx': '' });

      AIR_ENV.cacheDir = '.my-cache';
      AIR_ENV.cacheScope = '@my-scope';

      app = makeApp(dir);

      expect(fs.existsSync(fixturePath(dir, '.my-cache/manifest/index.ts'))).toBe(true);
      expect(fs.existsSync(fixturePath(dir, '.my-cache/manifest/package.json'))).toBe(true);

      const pkg = JSON.parse(readFixture(dir, '.my-cache/manifest/package.json'));
      expect(pkg.name).toBe('@my-scope/manifest');
    });

    it('metadata node uses configured cacheDir and cacheScope', () => {
      dir = makeFixture({ 'pages/docs/page.mdx': '# Hello\n' });

      AIR_ENV.cacheDir = '.my-cache';
      AIR_ENV.cacheScope = '@my-scope';

      app = makeApp(dir);

      expect(fs.existsSync(fixturePath(dir, '.my-cache/metadata/index.ts'))).toBe(true);
      expect(fs.existsSync(fixturePath(dir, '.my-cache/metadata/package.json'))).toBe(true);

      const pkg = JSON.parse(readFixture(dir, '.my-cache/metadata/package.json'));
      expect(pkg.name).toBe('@my-scope/metadata');
    });

    it('route node links metadata using configured cacheScope', () => {
      dir = makeFixture({ 'pages/docs/page.mdx': '# Guide\n' });

      AIR_ENV.cacheDir = '.my-cache';
      AIR_ENV.cacheScope = '@my-scope';

      app = makeApp(dir, { linkMetadata: true });

      const route = readFixture(dir, 'pages/docs/route.ts');
      expect(route).toContain("import docsMeta from '@my-scope/metadata/docs/page.js';");
      expect(route).toContain('.meta(docsMeta)');
    });
  });
});
