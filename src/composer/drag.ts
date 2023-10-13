import { logger } from '@beerush/utils';
import { useRef } from '../hook/index.js';
import { Button } from './button.js';

export type DragOptions = {
  move?: boolean;
  translate?: boolean;
  button?: Button;
  draggable?: boolean;
  deltaScale?: number;
}

export enum DragEventType {
  Start = 'drag-start',
  Move = 'drag-move',
  End = 'drag-end',
}

export type DragEventDetail = {
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  startWidth: number;
  startHeight: number;
}

export type CustomDragEvent = CustomEvent<DragEventDetail>;
export type DragInstance = {
  update: (options?: DragOptions) => void;
  destroy: () => void;
}

export function drag(element: HTMLElement, options?: DragOptions): DragInstance {
  let { deltaScale = 1, button = Button.Left, draggable = true, move, translate } = options || {};

  let startX = 0; // Pointer Start X.
  let startY = 0; // Pointer Start Y.
  let deltaX = 0; // Pointer Current X.
  let deltaY = 0; // Pointer Current Y.
  let startLeft = 0; // Element Start Left.
  let startTop = 0; // Element Start Top.
  let startWidth = 0; // Scale Start Width.
  let startHeight = 0; // Scale Start Height.
  let dragInit = false;
  let dragging = false;

  const dispatch = (type: DragEventType) => {
    const event = new CustomEvent(type, {
      detail: { startX, startY, deltaX, deltaY, startWidth, startHeight },
      cancelable: true,
      bubbles: true,
      composed: true,
    });

    element.dispatchEvent(event);
  };

  const dragStart = (e: MouseEvent) => {
    if (e instanceof MouseEvent && e.button !== button) return;
    if (!element.contains(e.target as never)) return;

    dragInit = true;
  };

  const dragMove = (e: MouseEvent) => {
    if (!dragInit) return;
    if (!dragging) {
      dragging = true;

      const { left, top, width, height } = element.getBoundingClientRect();

      startX = e.clientX;
      startY = e.clientY;
      startLeft = left;
      startTop = top;
      startWidth = width;
      startHeight = height;

      dispatch(DragEventType.Start);
      logger.debug(`[drag] Drag started.`);
    }

    if (!dragging) return;

    const x = ((e.clientX - startX) / deltaScale);
    const y = ((e.clientY - startY) / deltaScale);

    if (deltaX !== x || deltaY !== y) {
      deltaX = x;
      deltaY = y;

      if (move) {
        element.style.left = `${ startLeft + deltaX }px`;
        element.style.top = `${ startTop + deltaY }px`;
      } else if (translate) {
        element.style.transform = `translate3d(${ deltaX }px, ${ deltaY }px, 0)`;
      }

      dispatch(DragEventType.Move);
    }
  };

  const dragEnd = (e: MouseEvent) => {
    if (e instanceof MouseEvent && e.button !== button) return;
    if (!element.contains(e.target as never)) return;
    if (!dragInit) return;

    if (dragInit && !dragging) {
      dragInit = false;
      return;
    }

    dispatch(DragEventType.End);

    dragInit = false;
    dragging = false;

    logger.debug(`[drag] Drag completed by (${ deltaX }px, ${ deltaY }px).`);
  };

  let touch: Touch | undefined;
  const touchStart = (e: TouchEvent) => {
    if (button === 1 && e.touches.length === 2) {
      const [ a, b ] = (e.touches as never) as Touch[];

      const xDistance = Math.abs(a.clientX - b.clientX);
      const yDistance = Math.abs(a.clientY - b.clientY);

      if (xDistance < 100 && yDistance < 100) {
        touch = a;
        const { clientX: x, clientY: y } = touch as Touch;
        dragStart({ x, y, target: (touch as Touch).target } as never);
      }
    } else if (button === 0 && e.touches.length === 1) {
      touch = e.touches[0];
      const { clientX: x, clientY: y } = touch;
      dragStart({ x, y, target: touch.target } as never);
    }
  };

  const touchMove = (e: TouchEvent) => {
    if ((button === 0 && e.touches.length === 1) || (button === 1 && e.touches.length === 2)) {
      e.preventDefault();
      e.stopPropagation();

      touch = e.touches[0];
      const { clientX: x, clientY: y } = touch;
      dragMove({ x, y, target: e.target } as never);
    }
  };

  const touchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0 && touch) {
      dragEnd(e as never);
      touch = undefined;
    }
  };

  const register = () => {
    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);

    element.addEventListener('touchstart', touchStart, { passive: false });
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd, { passive: false });

    logger.debug(`[drag] Drag registered.`);
  };

  const unregister = () => {
    element.removeEventListener('mousedown', dragStart);
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);

    element.removeEventListener('touchstart', touchStart);
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);

    logger.debug(`[drag] Drag destroyed.`);
  };

  if (draggable) {
    register();
  }

  return {
    update: (opt?: DragOptions) => {
      logger.debug(`[drag] Drag reconfigure.`);

      if (opt?.draggable !== draggable) {
        unregister();

        draggable = opt?.draggable ?? draggable;

        if (draggable) {
          register();
        }
      }

      move = opt?.move ?? move;
      translate = opt?.translate ?? translate;
      button = opt?.button ?? button;
      deltaScale = opt?.deltaScale ?? deltaScale;
    },
    destroy: () => {
      unregister();
    },
  };
}

export type DragUpdater = (opt?: DragOptions) => void;
export type DragDestroyer = () => void;
export type Drag = {
  drag: (element: HTMLElement) => void;
  update: DragUpdater;
  destroy: DragDestroyer;
  addEventListener: (type: DragEventType, fn: (e: CustomDragEvent) => void) => void;
  removeEventListener: (type: DragEventType, fn: (e: CustomDragEvent) => void) => void;
};

export function createDrag(options?: DragOptions): Drag {
  let target: HTMLElement | undefined;
  let instance: DragInstance | undefined;

  return {
    drag: (element: HTMLElement) => {
      instance?.destroy();
      target = element;
      instance = drag(target, options);
    },
    update: (opt?: DragOptions) => {
      instance?.update(opt);
    },
    destroy: () => {
      instance?.destroy();
    },
    addEventListener: (type: string, fn: (e: CustomDragEvent) => void) => {
      target?.addEventListener(type, fn as never);
    },
    removeEventListener: (type: string, fn: (e: CustomDragEvent) => void) => {
      target?.removeEventListener(type, fn as never);
    },
  };
}

export type DragRef = {
  current?: HTMLElement;
};

export function useDrag(options?: DragOptions): [ DragRef, DragUpdater, DragDestroyer, Drag ] {
  const target = useRef<HTMLElement>();
  const instance = createDrag(options);

  const ref = {
    set current(element: HTMLElement | undefined) {
      if (element && target.current !== element) {
        target.current = element;
        instance.drag(element);
      } else if (!element) {
        instance.destroy();
      }
    },
    get current(): HTMLElement | undefined {
      return target.current;
    },
  };
  return [ ref, instance.update, instance.destroy, instance ];
}
