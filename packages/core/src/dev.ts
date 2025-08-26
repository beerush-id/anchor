import type {
  KeyLike,
  Linkable,
  LinkableSchema,
  ObjLike,
  StateMetadata,
  StateObserver,
  StateSubscriber,
} from './types.js';
import { isFunction, isObject } from '@beerush/utils';
import { captureStack } from './exception.js';

export type DevTool = {
  /**
   * A callback that will be called when a property is accessed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {KeyLike} prop
   */
  onGet?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, prop: KeyLike) => void;
  /**
   * A callback that will be called when a property is set.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {KeyLike} prop
   * @param {unknown} value
   */
  onSet?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    prop: KeyLike,
    value: unknown
  ) => void;
  /**
   * A callback that will be called when a property is deleted.
   * @param {StateMetadata} meta
   * @param {KeyLike} prop
   */
  onDelete?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, prop: KeyLike) => void;
  /**
   * A callback that will be called when a method is called.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {string} method
   * @param {unknown[]} args
   */
  onCall?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    method: string,
    args: unknown[]
  ) => void;
  /**
   * A callback that will be called when a state is initialized.
   * @param {StateMetadata} meta - State metadata associated with the event.
   */
  onInit?: <T extends Linkable, S extends LinkableSchema>(init: Linkable, meta: StateMetadata<T, S>) => void;
  /**
   * A callback that will be called when a bulk assignment is performed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {ObjLike} source
   */
  onAssign?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, source: ObjLike) => void;
  /**
   * A callback that will be called when a bulk removal is performed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {KeyLike[]} props
   */
  onRemove?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, props: KeyLike[]) => void;
  /**
   * A callback that will be called when a state is cleared.
   * @param {StateMetadata} meta - State metadata associated with the event.
   */
  onClear?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>) => void;
  /**
   * A callback that will be called when a state is destroyed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   */
  onDestroy?: <T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) => void;
  /**
   * A callback that will be called when a subscriber is added.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {StateSubscriber<Linkable>} handler
   */
  onSubscribe?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    handler: StateSubscriber<T>,
    receiver?: Linkable
  ) => void;
  /**
   * A callback that will be called when a subscriber is removed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {StateSubscriber<Linkable>} handler
   */
  onUnsubscribe?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    handler: StateSubscriber<T>,
    receiver?: Linkable
  ) => void;
  /**
   * A callback that will be called when a child reference is linked.
   * @param {StateMetadata} meta
   * @param {StateMetadata} child
   */
  onLink?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, child: StateMetadata) => void;
  /**
   * A callback that will be called when a child reference is unlinked.
   * @param {StateMetadata} meta
   * @param {StateMetadata} child
   */
  onUnlink?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, child: StateMetadata) => void;
  /**
   * A callback that will be called when a state is being tracked by an observer.
   * @param {StateMetadata} meta
   * @param {StateObserver} observer
   */
  onTrack?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    observer: StateObserver,
    key: KeyLike
  ) => void;
  /**
   * A callback that will be called when a state is no longer being tracked by an observer.
   * @param {StateMetadata} meta
   * @param {StateObserver} observer
   */
  onUntrack?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    observer: StateObserver
  ) => void;
};

let activeDevTool: DevTool | undefined = undefined;

/**
 * Sets the active development tool. This tool will receive callbacks for various state-related events.
 * @param {DevTool} devTool - The development tool to set as active.
 */
export function setDevTool(devTool: DevTool) {
  if (!isObject(devTool)) {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a valid DevTool object.', error, setDevTool);
    return;
  }

  for (const [key, value] of Object.entries(devTool)) {
    if (!isFunction(value)) {
      const error = new Error('Invalid callback.');
      captureStack.error.argument(`The given callback for "${key}" is not a function.`, error, setDevTool);
      delete devTool[key as never];
    }
  }

  if (!Object.keys(devTool).length) {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a valid DevTool object.', error, setDevTool);
    return;
  }

  const prevDevTool = activeDevTool;
  activeDevTool = devTool;

  return () => {
    activeDevTool = prevDevTool;
  };
}

/**
 * Retrieves the currently active development tool.
 * @returns {DevTool | undefined} The active development tool, or `undefined` if none is set.
 */
export function getDevTool(): DevTool | undefined {
  return activeDevTool;
}
