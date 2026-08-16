import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { AnyType } from '@anchorlib/core';
import { color, taggedLogger } from '../logger.js';
import type { FileMap, Framework } from '../utils/mapper.js';
import { scaffoldForFile } from '../utils/scaffold.js';

const log = taggedLogger('air-pages');

import { AIR_ENV } from './env.js';
import { FolderNode } from './folder-node.js';
import { ManifestNode } from './manifest.js';
import { MetadataNode } from './metadata.js';
import { RouteNode } from './route-node.js';

/** Configuration options for the AppNode foundation. */
export type AppNodeOptions = {
  /** Absolute path to the project root (`config.root`). */
  root: string;
  /** Absolute path to the pages directory. */
  pagesDir: string;
  /** Absolute path to the app source directory where entry files are scaffolded. */
  appDir: string;
  /** Absolute path to the router file. */
  routerFile: string;
  /** UI framework for scaffolds and generated code. */
  framework: Framework;
  /** Resolved file name map (defaults merged with user overrides). */
  fileMap: FileMap;
  /** Whether to generate the route manifest. Defaults to true. */
  manifestEnabled?: boolean;
  /** Whether to generate MDX metadata. Defaults to true. */
  metadataEnabled?: boolean;
  /** Whether to scaffold entry files. Defaults to true. */
  scaffoldEnabled?: boolean;
};

/**
 * Central state orchestrator for the file-system router.
 * Scans the filesystem and constructs parallel domain trees (Routes, Metadata, Manifest).
 */
export class AppNode extends EventEmitter {
  public readonly rootFolder: FolderNode;
  public readonly rootRoute?: RouteNode;
  public readonly rootMetadata?: MetadataNode;
  public readonly rootManifest?: ManifestNode;

  private readonly fileMap: FileMap;

  /**
   * Initializes the application node, scaffolds missing required files,
   * and builds the initial filesystem trees.
   *
   * @param opts Application node configuration options.
   */
  constructor(private readonly opts: AppNodeOptions) {
    super();
    this.fileMap = opts.fileMap;

    this.rootFolder = new FolderNode(opts.pagesDir);
    this.scaffoldProject();
    this.rootFolder.scan();

    log.verbose(color.event('Booting route tree'));
    this.rootRoute = new RouteNode(this.rootFolder, undefined, this.fileMap, opts.framework, opts.routerFile);
    this.rootRoute.on('change', this.handleChange);
    this.rootRoute.boot();

    AIR_ENV.routes.attach(this.rootRoute);

    if (opts.metadataEnabled !== false) {
      log.verbose(color.event('Booting metadata tree'));
      this.rootMetadata = new MetadataNode(this.rootFolder, undefined, opts.root, opts.pagesDir);
      this.rootMetadata.on('change', this.handleChange);
      this.rootMetadata.boot();
    }

    if (opts.manifestEnabled !== false) {
      log.verbose(color.event('Booting manifest tree'));
      this.rootManifest = new ManifestNode(this.rootRoute, this.rootFolder, undefined, opts.root, this.fileMap.route);
      this.rootManifest.on('change', this.handleChange);
      this.rootManifest.boot();
    }

    log.debug(color.event('app tree booted'));
  }

  private handleChange = (file: string, kind: 'update' | 'reload') => {
    this.emit('change', file, kind);
  };

  /**
   * Cleans up watchers and event listeners across all domain trees.
   */
  public destroy() {
    this.rootManifest?.destroy();
    this.rootMetadata?.destroy();
    this.rootRoute?.destroy();
    this.rootFolder?.destroy();
    this.emit('destroy');
    this.removeAllListeners();
  }

  private scaffoldEntryFile(file: string) {
    let shouldWrite = false;
    try {
      if (fs.statSync(file).size === 0) shouldWrite = true;
    } catch {
      shouldWrite = true;
    }

    if (!shouldWrite) return;

    const base = path.basename(file);
    const content = scaffoldForFile({
      base,
      framework: this.opts.framework,
      files: this.fileMap,
      folder: undefined,
    });

    if (content) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        log.debug(color.event('Scaffolded'), color.file(path.relative(this.opts.root, file)));
      } catch {}
    }
  }

  private scaffoldProject() {
    if (!fs.existsSync(this.opts.routerFile)) {
      fs.mkdirSync(path.dirname(this.opts.routerFile), { recursive: true });
      fs.writeFileSync(
        this.opts.routerFile,
        [
          `import { createRouter } from '@anchorlib/${this.opts.framework}';`,
          '',
          'const router = createRouter();',
          'export default router;',
        ].join('\n'),
        'utf-8'
      );
      log.info(color.event('Scaffolded'), color.file(path.relative(this.opts.root, this.opts.routerFile)));
    }

    if (!fs.existsSync(this.opts.pagesDir)) {
      fs.mkdirSync(this.opts.pagesDir, { recursive: true });

      // The root layout and page are generated through the shared scaffold
      // utility so the output is framework-agnostic (no hardcoded React types).
      this.rootFolder.files.add(this.fileMap.layout);
      this.rootFolder.files.add(this.fileMap.page);

      for (const base of [this.fileMap.layout, this.fileMap.page]) {
        const content = scaffoldForFile({
          base,
          folder: this.rootFolder as AnyType,
          framework: this.opts.framework,
          files: this.fileMap,
        });

        if (content) {
          fs.writeFileSync(path.join(this.opts.pagesDir, base), content, 'utf-8');
        }
      }

      log.info(color.event('Scaffolded initial pages'), '(layout + page)');
    }

    if (this.opts.scaffoldEnabled !== false) {
      for (const file of [this.fileMap.entry, this.fileMap.client, this.fileMap.workerEntry, this.fileMap.ambient]) {
        this.scaffoldEntryFile(path.join(this.opts.appDir, file));
      }
    }
  }
}
