import type { AnyType } from '@airlib/core';
import type { ComponentProps, JSX, JSXElementConstructor, ReactNode } from 'react';

/**
 * Represents a function that returns a ReactNode.
 * Typically used for lazy or dynamic rendering of children components.
 */
type NodeRenderer = (...args: AnyType[]) => ReactNode;

/**
 * Represents a standard React node or a render function.
 */
type FineNode = ReactNode | NodeRenderer;

/**
 * Represents properties for a dynamic component.
 * It extends standard component properties but allows `children` to be a render function as well as standard React nodes.
 *
 * @template T - The intrinsic element tag or JSX component constructor.
 */
export type DynamicProps<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<AnyType>> = Omit<
  ComponentProps<T>,
  'children'
> & {
  /**
   * The content to render. It can be standard React children or a function that returns React nodes.
   */
  children?: FineNode;
};

/**
 * Renders a `FineNode` by invoking it if it is a function, or returning it directly otherwise.
 *
 * @param children - The node or render function to evaluate.
 * @param args - Arguments to pass to the render function if `children` is a function.
 * @returns The evaluated React node.
 */
export const renderDynamic = (children?: FineNode, ...args: AnyType[]): ReactNode => {
  if (typeof children === 'function') {
    try {
      return children(...args);
    } catch (error) {
      return `[Render Error]: Failed to render dynamic: ${(error as Error).message}`;
    }
  }
  return children as ReactNode;
};
