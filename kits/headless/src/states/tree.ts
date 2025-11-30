import { mutable } from '@anchorlib/core';

export type TreeNode<T> = {
  value: T;
  expanded: boolean;
  disabled?: boolean;
  children?: TreeNode<T>[];
};

export type TreeInit<T> = {
  nodes: TreeNode<T>[];
  disabled?: boolean;
};

export class TreeState<T> {
  public nodes: TreeNode<T>[];
  public disabled: boolean;

  constructor(init: TreeInit<T>) {
    this.nodes = init.nodes;
    this.disabled = init.disabled ?? false;
  }

  public toggle(node: TreeNode<T>, recursive?: boolean) {
    if (node.disabled || this.disabled) return;

    node.expanded = !node.expanded;
    if (recursive && node.children?.length) {
      node.children.forEach((child) => {
        if (node.expanded) {
          this.expand(child, true);
        } else {
          this.collapse(child, true);
        }
      });
    }
  }

  public expand(node: TreeNode<T>, recursive?: boolean) {
    if (node.disabled || this.disabled) return;

    node.expanded = true;
    if (recursive && node.children?.length) {
      node.children.forEach((child) => this.expand(child, true));
    }
  }

  public collapse(node: TreeNode<T>, recursive?: boolean) {
    if (node.disabled || this.disabled) return;

    node.expanded = false;
    if (recursive && node.children?.length) {
      node.children.forEach((child) => this.collapse(child, true));
    }
  }

  public expandAll(): void {
    if (this.disabled) return;
    this.nodes.forEach((node) => this.expand(node, true));
  }

  public collapseAll(): void {
    if (this.disabled) return;
    this.nodes.forEach((node) => this.collapse(node, true));
  }
}

export function createTree<T>(init: TreeInit<T>): TreeState<T> {
  return mutable(new TreeState(init));
}
