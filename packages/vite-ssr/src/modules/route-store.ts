import path from 'node:path';
import { deriveNamedRouteName, namedPageName } from '../utils/mapper.js';
import type { RouteNode } from './route-node.js';

export type RouteResolution = {
  node: RouteNode;
  exportName: string;
  isIndex: boolean;
  isLayout: boolean;
};

/**
 * Central registry over the route tree, keyed by absolute folder path.
 * Resolves a Vite module id to the structural identity of its file — layout,
 * index page, named page, or plain route — along with the exact generated
 * export name to import, so consumers never have to probe the filesystem or
 * guess naming conventions.
 */
export class RouteStore extends Map<string, RouteNode> {
  private root?: RouteNode;

  /**
   * Attaches the root of the built filesystem tree. Called by the bootloader
   * (`AppNode`) once the tree has been constructed; populates the registry
   * with every folder in the tree.
   */
  public attach(root: RouteNode): void {
    this.root = root;
    this.clear();

    const visit = (node: RouteNode) => {
      this.set(node.folderNode.dir, node);
      for (const child of node.children.values()) visit(child);
    };

    visit(root);
  }

  /**
   * Resolves an absolute file path (Vite module id) into its route identity.
   * Folders created at runtime (after `attach`) are resolved against the live
   * tree and cached back into the registry.
   */
  public resolve(id: string): RouteResolution | undefined {
    const [file] = id.split('?');
    const dir = path.dirname(file);

    let node = this.get(dir);
    if (!node) {
      node = this.findNode(this.root, dir);
      if (node) this.set(dir, node);
    }

    if (!node) return undefined;

    const files = node.fileMap;
    const base = path.basename(file);

    if (base === files.layout || base === files.layoutMdx) {
      return { node, exportName: node.routeName, isIndex: false, isLayout: true };
    }

    if (base === files.page || base === files.pageMdx) {
      return {
        node,
        exportName: node.layout ? node.indexName : node.routeName,
        isIndex: node.layout,
        isLayout: false,
      };
    }

    for (const namedPage of node.namedPages) {
      /* istanbul ignore else */
      if (base === namedPage) {
        const pageName = namedPageName(namedPage, node.fileMap);
        return {
          node,
          exportName: deriveNamedRouteName(node.folderNode.segment, pageName),
          isIndex: false,
          isLayout: false,
        };
      }
    }

    return undefined;
  }

  private findNode(node: RouteNode | undefined, dir: string): RouteNode | undefined {
    if (!node) return undefined;
    if (node.folderNode.dir === dir) return node;

    for (const child of node.children.values()) {
      const found = this.findNode(child, dir);
      /* istanbul ignore else */
      if (found) return found;
    }

    return undefined;
  }
}
