import { type FunctionComponent } from 'react';
import { useObserverRef } from '@base/index.js';
import { type Linkable, setObserver } from '@anchorlib/core';

/**
 * `useObserverNode` is a custom React hook that leverages `useObserverRef` to manage
 * a `StateObserver` instance and provides a mechanism to set and restore the
 * current observing context within the React component tree.
 *
 * It returns a special `Unobserve` component that, when rendered, restores the
 * observer context to its previous state (or `undefined` if no previous context existed).
 * This ensures that reactive tracking only occurs within the intended scope
 * (typically during the render phase of components that consume reactive state).
 *
 * @param deps An optional array of `Linkable` dependencies. Changes in these dependencies
 *             will cause the underlying observer to be re-established.
 * @param displayName An optional name for the observer, useful for debugging.
 * @returns A tuple containing:
 *          - `FunctionComponent`: An `Unobserve` component that restores the observer context.
 *          - `number`: A version counter that increments on state changes, forcing re-renders.
 */
export function useObserverNode(deps: Linkable[] = [], displayName?: string): [FunctionComponent, number] {
  const [observer, version] = useObserverRef(deps, displayName);

  // Setting the observer as the current observing context.
  const restore = setObserver(observer);

  const Unobserve = () => {
    return <>{restore() as never}</>;
  };

  return [Unobserve, version];
}
