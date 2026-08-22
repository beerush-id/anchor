import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { subscribe } from '../reactive/subscription.js';
import { onCleanup } from '../scope/lifecycle.js';
import { isBrowser } from '../shared/env.js';
import type { AnyType, StateSubscriber, StateUnsubscribe } from '../types.js';
import { onInteractive } from './interactive.js';

/**
 * Interface representing the payload data of a drag event.
 */
export interface DragContent<T = AnyType> {
  type: string;
  text?: string;
  data?: T;
  files: File[];
  count: number;
}

/**
 * Type for optional drag content configuration.
 */
export type DragOption<T = AnyType> = Partial<DragContent<T>>;

/**
 * Interface representing the reactive drag-and-drop state.
 */
export interface LiveDnD<T = AnyType, E extends Element = Element> {
  x: number;
  y: number;
  data: DragContent<T>;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  payload: DragContent<T>;
  isDragging: boolean;
  isInternal: boolean;

  zone?: E;
  target?: E;

  /**
   * Registers drop zones to accept dropped elements.
   * @param elements - The elements to mark as droppable.
   * @returns A cleanup function.
   */
  droppable(...elements: (E | null | undefined)[]): () => void;
  /**
   * Marks an element as draggable and attaches drag payload data.
   * @param element - The element to make draggable.
   * @param state - The payload to attach to the element.
   * @returns A cleanup function.
   */
  draggable(element: E | null | undefined, state?: DragOption<T>): () => void;
  /**
   * Subscribes to drag-and-drop state changes.
   * @param handler - The subscription handler.
   * @returns An unsubscribe function.
   */
  subscribe(handler: StateSubscriber<LiveDnD<T>>): StateUnsubscribe;
  /**
   * Manually handles a drop event and parses its content.
   * @param e - The drag event.
   * @returns The parsed drag content.
   */
  drop(e: DragEvent): DragContent<T>;
}

const DATA = mutable<DragContent>(emptyContent(), { recursive: false });

const PAYLOAD_INIT = emptyContent();
const PAYLOAD = mutable<DragContent>(PAYLOAD_INIT, { recursive: false });

const DND_INIT: Omit<LiveDnD, 'droppable' | 'draggable' | 'subscribe' | 'drop'> = {
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  deltaX: 0,
  deltaY: 0,
  isDragging: false,
  isInternal: false,
  data: DATA,
  payload: PAYLOAD,
};

const DND_STATE = mutable(DND_INIT, { recursive: false }) as LiveDnD;
/**
 * Reactive drag-and-drop state.
 * Used to manage drag interactions and transfer data between draggable elements and drop zones.
 */
export const LIVE_DND = {} as LiveDnD;

const DROP_ZONES = new Set<Element>();
const DRAG_PAIRS = new WeakMap<Element, DragOption | undefined>();
let DND_WATCHED = false;

LIVE_DND.subscribe = (handler) => {
  if (!isBrowser()) return () => {};
  const unsubscribe = subscribe(DND_STATE, handler);
  onCleanup(unsubscribe);
  return unsubscribe;
};

LIVE_DND.droppable = (...elements: (Element | null | undefined)[]) => {
  watchDnd();
  const valid = elements.filter(Boolean) as Element[];

  for (const el of valid) {
    DROP_ZONES.add(el);
  }

  const cleanup = () => {
    for (const el of valid) {
      DROP_ZONES.delete(el);
    }
  };

  onCleanup(cleanup);
  return cleanup;
};

LIVE_DND.draggable = (element: Element | null | undefined, state?: DragOption) => {
  if (!element) return () => {};
  watchDnd();

  DRAG_PAIRS.set(element, state);

  if (state) {
    element.setAttribute('draggable', 'true');
  } else {
    element.removeAttribute('draggable');
  }

  const cleanup = () => {
    DRAG_PAIRS.delete(element);
    element.removeAttribute('draggable');
  };

  onCleanup(cleanup);
  return cleanup;
};

LIVE_DND.drop = (e: DragEvent) => {
  if (isDropZone(e.target)) {
    e.preventDefault();
  }

  const parsed = parseDataTransfer(e.dataTransfer);

  const cachedFiles = PAYLOAD_INIT.files ?? [];
  const parsedFiles = parsed.files ?? [];
  const files = [...cachedFiles, ...parsedFiles].filter((file) => {
    return !!file.name;
  });

  anchor.assign(DATA, { ...emptyContent(), ...parsed, files });
  DND_STATE.zone = e.target as Element;

  if (e.dataTransfer) {
    e.dataTransfer.clearData();
  }

  return DATA;
};

for (const key of ['target', 'zone', ...Object.keys(DND_INIT)]) {
  Object.defineProperty(LIVE_DND, key, {
    get() {
      watchDnd();
      return DND_STATE[key as keyof LiveDnD];
    },
  });
}

function watchDnd() {
  if (DND_WATCHED || !isBrowser()) return;
  DND_WATCHED = true;

  const ghost = new Image();
  ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  onInteractive(() => {
    let dragCounter = 0;

    const dragStartHandler = (e: DragEvent) => {
      dragCounter++;

      const target = e.target as HTMLElement;
      const option = DRAG_PAIRS.get(target as Element) ?? {};
      const parsed = parseDataTransfer(e.dataTransfer);
      const isInternal = DRAG_PAIRS.has(target as Element);
      const { type, count, text, data, files } = option;

      const payload = {
        type: type || parsed.type,
        text: text ?? parsed.text,
        data: data ?? parsed.data,
        files: files?.length ? files : (parsed.files ?? []),
        count: count ?? parsed.count,
      };
      anchor.assign(PAYLOAD, payload);

      /* istanbul ignore else */
      if (e.dataTransfer) {
        if (isInternal) e.dataTransfer.setDragImage(ghost, 0, 0);

        e.dataTransfer.setData(
          'application/x-anchor-dnd',
          anchor.stringify({
            ...PAYLOAD_INIT,
          })
        );

        /* istanbul ignore else */
        if (PAYLOAD_INIT.files?.length) {
          for (const file of PAYLOAD_INIT.files) {
            e.dataTransfer.items.add(file);
          }
        }
      }

      const nextState = {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        deltaX: 0,
        deltaY: 0,
        isInternal: DRAG_PAIRS.has(target as Element),
      } as Partial<LiveDnD>;

      /* istanbul ignore else */
      if (target as HTMLElement) {
        nextState.target = target as HTMLElement;
        const { x, y } = target.getBoundingClientRect();
        Object.assign(nextState, { x, y });
      }

      startDndState(e, nextState);
    };

    const dragEnterHandler = (e: DragEvent) => {
      dragCounter++;

      const parsed = parseDataTransfer(e.dataTransfer);

      anchor.assign(PAYLOAD, parsed);
      startDndState(e);
    };

    const dragOverHandler = (e: DragEvent) => {
      const { startX, startY } = DND_INIT;
      if (isDropZone(e.target)) {
        e.preventDefault();
      }

      anchor.assign(DND_STATE, {
        x: e.clientX,
        y: e.clientY,
        deltaX: e.clientX - startX,
        deltaY: e.clientY - startY,
      });
    };

    const dragLeaveHandler = () => {
      dragCounter--;

      /* istanbul ignore else */
      if (dragCounter <= 0) {
        dragCounter = 0;
        DND_STATE.isDragging = false;
      }
    };

    const dropHandler = (e: DragEvent) => {
      LIVE_DND.drop(e);
      resetDrag();
    };

    const dragEndHandler = () => {
      dragCounter = 0;
      resetDrag();
    };

    const events: [Window | Document, keyof WindowEventMap, (e: DragEvent) => void][] = [
      [window, 'blur', dragEndHandler],
      [document, 'drop', dropHandler],
      [document, 'dragend', dragEndHandler],
      [document, 'dragover', dragOverHandler],
      [document, 'dragstart', dragStartHandler],
      [document, 'dragenter', dragEnterHandler],
      [document, 'dragleave', dragLeaveHandler],
    ];

    for (const [target, event, handler] of events) {
      target.addEventListener(event, handler as typeof dragEndHandler);
    }

    return () => {
      for (const [target, event, handler] of events) {
        target.removeEventListener(event, handler as typeof dragEndHandler);
      }
    };
  });
}

function emptyContent(): DragContent {
  return { type: '', text: undefined, data: undefined, files: [], count: 0 };
}

function parseDataTransfer(source: DataTransfer | null) {
  const result = {} as DragOption;
  if (!source) return result;

  const plain = source.getData('text/plain');
  if (plain) {
    result.type = 'text';
    result.text = plain;
  }

  try {
    const dnd = source.getData('application/x-anchor-dnd');
    if (dnd) {
      Object.assign(result, JSON.parse(dnd));
      return result;
    }

    const json = source.getData('application/json');
    if (json) {
      result.type = 'json';
      result.data = JSON.parse(json);
    }
  } catch (_e) {}

  if (source.types.includes('Files')) {
    result.type = 'file';
    result.count = Array.from(source.items).filter((item) => item.kind === 'file').length;
  }

  if (source.files.length) {
    result.files = Array.from(source.files);

    const mimes = new Set();
    for (const file of result.files) {
      mimes.add(file.type.split('/')[0]);
    }
    /* istanbul ignore else */
    if (mimes.size === 1) result.type = mimes.values().next().value as string;
  }

  return result;
}

function startDndState(e: DragEvent, options?: Partial<LiveDnD>) {
  const output = { ...options, isDragging: true } as LiveDnD;

  /* istanbul ignore else */
  if (e.target) output.target = e.target as Element;
  anchor.assign(DND_STATE, output); // Triggers reactivity.
}

function isDropZone(target: EventTarget | null) {
  if (!target || DROP_ZONES.size === 0) return false;
  for (const zone of DROP_ZONES) {
    if (zone.contains(target as Node)) return true;
  }
  return false;
}

function resetDrag() {
  anchor.assign(PAYLOAD, emptyContent());
  anchor.assign(DND_STATE, {
    isDragging: false,
    isInternal: false,
    target: undefined,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    x: 0,
    y: 0,
  });
}
