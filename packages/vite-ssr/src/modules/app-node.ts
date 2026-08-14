import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_FILE_MAP, type FileMap, type Framework } from '../utils/mapper.js';
import { scaffoldForFile } from '../utils/scaffold.js';
import { FolderNode } from './folder-node.js';
import { ManifestNode } from './manifest.js';
import { MetadataNode } from './metadata.js';
import { RouteNode } from './route-node.js';

/** Configuration options for the AppNode foundation. */
export type AppNodeOptions = {
  root: string;
  pagesDir: string;
  appDir: string;
  routerFile: string;
  framework: Framework;
  fileMap?: Partial<FileMap>;
  manifestEnabled?: boolean;
  metadataEnabled?: boolean;
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
    this.fileMap = { ...DEFAULT_FILE_MAP, ...opts.fileMap };

    this.scaffoldProject();

    this.rootFolder = new FolderNode(opts.pagesDir);
    this.rootFolder.scan();

    this.rootRoute = new RouteNode(this.rootFolder, undefined, this.fileMap, opts.framework, opts.routerFile);
    this.rootRoute.on('change', this.handleChange);
    this.rootRoute.boot();

    if (opts.metadataEnabled !== false) {
      this.rootMetadata = new MetadataNode(this.rootFolder, undefined, opts.root, opts.pagesDir);
      this.rootMetadata.on('change', this.handleChange);
      this.rootMetadata.boot();
    }

    if (opts.manifestEnabled !== false) {
      this.rootManifest = new ManifestNode(this.rootRoute, this.rootFolder, undefined, opts.root, this.fileMap.route);
      this.rootManifest.on('change', this.handleChange);
      this.rootManifest.boot();
    }
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
    }

    if (!fs.existsSync(this.opts.pagesDir)) {
      fs.mkdirSync(this.opts.pagesDir, { recursive: true });
      const routeMod = `./${this.fileMap.route.replace(/\\.[^.]+$/, '.js')}`;
      fs.writeFileSync(
        path.join(this.opts.pagesDir, this.fileMap.layout),
        `import { page } from '@anchorlib/${this.opts.framework}';\nimport { rootRoute } from '${routeMod}';\n\nfunction LayoutView({ children }: { children?: React.ReactNode }) {\n  return children;\n}\n\nexport default page(rootRoute).render(LayoutView);\n`,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(this.opts.pagesDir, this.fileMap.page),
        `import { page } from '@anchorlib/${this.opts.framework}';\nimport { indexRoute } from '${routeMod}';\n\nfunction PageView() {\n  return (\n    <>\n      <h1>Welcome to AIR Stack</h1>\n      <p>This is your generated home page.</p>\n    </>\n  );\n}\n\nexport default page(indexRoute).render(PageView);\n`,
        'utf-8'
      );
    }

    if (this.opts.scaffoldEnabled !== false) {
      for (const file of [this.fileMap.entry, this.fileMap.client, this.fileMap.workerEntry, this.fileMap.ambient]) {
        this.scaffoldEntryFile(path.join(this.opts.appDir, file));
      }
    }
  }
}
