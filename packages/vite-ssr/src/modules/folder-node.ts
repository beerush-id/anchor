import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';

/**
 * Represents a directory in the filesystem, acting as the foundational node
 * for file watching and structure scanning. Emits events for file and child
 * folder additions, removals, and changes.
 */
export class FolderNode extends EventEmitter {
  public files = new Set<string>();
  public children = new Map<string, FolderNode>();
  public readonly segment: string;
  public readonly rel: string;
  private watcher?: FSWatcher;

  /**
   * Initializes a new folder node.
   *
   * @param dir Absolute path to the directory.
   * @param parent Optional parent folder node.
   */
  constructor(
    public readonly dir: string,
    public readonly parent?: FolderNode
  ) {
    super();
    this.segment = parent ? path.basename(dir) : '';
    this.rel = parent ? (parent.rel ? `${parent.rel}/${this.segment}` : this.segment) : '';
  }

  /**
   * Synchronously scans the directory to populate files and child folder nodes.
   */
  public scan() {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const abs = path.join(this.dir, entry.name);

      if (entry.isDirectory()) {
        const child = new FolderNode(abs, this);
        this.children.set(entry.name, child);
        child.scan();
      } else if (entry.isFile()) {
        this.files.add(entry.name);
      }
    }
  }

  /**
   * Starts a non-recursive watcher for this directory, dispatching events on changes.
   */
  public watch() {
    if (this.watcher) return;
    this.watcher = chokidar.watch(this.dir, {
      depth: 0,
      ignoreInitial: true,
      ignored: /(^|[/\\])\../,
    });

    this.watcher.on('add', (file) => {
      this.handleFileAdded(path.basename(file));
    });

    this.watcher.on('change', (file) => {
      this.handleFileChanged(path.basename(file));
    });

    this.watcher.on('unlink', (file) => {
      this.handleFileRemoved(path.basename(file));
    });

    this.watcher.on('addDir', (dir) => {
      if (dir === this.dir) return;
      this.handleChildAdded(path.basename(dir), dir);
    });

    this.watcher.on('unlinkDir', (dir) => {
      if (dir === this.dir) return;
      this.handleChildRemoved(path.basename(dir));
    });

    for (const child of this.children.values()) {
      child.watch();
    }
  }

  public handleFileAdded(name: string) {
    if (this.files.has(name)) return;
    this.files.add(name);
    this.emit('fileAdded', name);
  }

  public handleFileRemoved(name: string) {
    if (!this.files.has(name)) return;
    this.files.delete(name);
    this.emit('fileRemoved', name);
  }

  public handleFileChanged(name: string) {
    if (!this.files.has(name)) return;
    this.emit('fileChanged', name);
  }

  public handleChildAdded(name: string, abs: string) {
    if (this.children.has(name)) return;
    const child = new FolderNode(abs, this);
    this.children.set(name, child);
    child.scan();
    if (this.watcher) {
      child.watch();
    }
    this.emit('childAdded', child);
  }

  public handleChildRemoved(name: string) {
    const child = this.children.get(name);
    if (!child) return;
    this.children.delete(name);
    child.destroy();
    this.emit('childRemoved', child);
  }

  /**
   * Closes the filesystem watcher and recursively destroys child nodes.
   */
  public destroy() {
    this.watcher?.close();
    for (const child of this.children.values()) {
      child.destroy();
    }
    this.children.clear();
    this.files.clear();
    this.emit('destroy');
    this.removeAllListeners();
  }

  /** O(depth) lookup for a path in the tree. */
  public findNode(absPath: string): FolderNode | undefined {
    if (this.dir === absPath) return this;
    if (!absPath.startsWith(this.dir)) return undefined;

    const relative = path.relative(this.dir, absPath);
    const segments = relative.split(path.sep);
    const nextSegment = segments[0];

    if (!nextSegment) return this;

    const child = this.children.get(nextSegment);
    if (child) return child.findNode(absPath);

    return undefined;
  }
}
