import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { FolderNode } from './folder-node.js';
import type { Framework } from './generate.js';
import { ManifestNode } from './manifest.js';
import { MetadataNode } from './metadata.js';
import { DEFAULT_FILE_MAP, type FileMap } from './model.js';
import { RouteNode } from './route-node.js';
import { scaffoldForFile } from './scaffold.js';

export type AppNodeOptions = {
  pagesDir: string;
  appDir: string;
  routerFile: string;
  framework: Framework;
  fileMap?: Partial<FileMap>;
  manifestDir?: string;
  metadataDir?: string;
  manifestEnabled?: boolean;
  metadataEnabled?: boolean;
  scaffoldEnabled?: boolean;
};

export class AppNode extends EventEmitter {
  public readonly rootFolder: FolderNode;
  public readonly rootRoute?: RouteNode;
  public readonly rootMetadata?: MetadataNode;
  public readonly rootManifest?: ManifestNode;

  private readonly fileMap: FileMap;

  constructor(private readonly opts: AppNodeOptions) {
    super();
    this.fileMap = { ...DEFAULT_FILE_MAP, ...opts.fileMap };

    // Scaffold entry files
    if (opts.scaffoldEnabled !== false) {
      for (const file of [this.fileMap.entry, this.fileMap.client, this.fileMap.workerEntry]) {
        this.scaffoldEntryFile(path.join(opts.appDir, file));
      }
    }

    // 1. Filesystem foundation
    this.rootFolder = new FolderNode(opts.pagesDir);
    this.rootFolder.scan(); // Initial synchronous scan

    // 2. Domain trees attached to the foundation
    this.rootRoute = new RouteNode(this.rootFolder, undefined, this.fileMap, opts.framework, opts.routerFile);
    this.rootRoute.on('change', this.handleChange);
    this.rootRoute.boot();

    if (opts.metadataEnabled !== false && opts.metadataDir) {
      this.rootMetadata = new MetadataNode(this.rootFolder, undefined, opts.metadataDir, opts.pagesDir);
      this.rootMetadata.on('change', this.handleChange);
      this.rootMetadata.boot();
    }

    if (opts.manifestEnabled !== false && opts.manifestDir) {
      this.rootManifest = new ManifestNode(
        this.rootRoute,
        this.rootFolder,
        undefined,
        opts.manifestDir,
        this.fileMap.route
      );
      this.rootManifest.on('change', this.handleChange);
      this.rootManifest.boot();
    }
  }

  private handleChange = (file: string, kind: 'update' | 'reload') => {
    this.emit('change', file, kind);
  };

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
      folder: undefined, // Entry files don't need folder context
    });

    if (content) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      } catch {}
    }
  }
}
