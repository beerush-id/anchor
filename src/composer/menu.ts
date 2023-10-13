import { anchor, State } from '../core/index.js';
import { arrows, escape, type Escaper, outside, type Outsider } from './utils/index.js';
import type { DirectionX, DirectionY } from './popup.js';

export type MenuType = 'context' | 'dropdown';
export type MenuOptions = {
  type?: MenuType;
  open?: boolean;
  portal?: string | HTMLElement;
  backdrop?: boolean;
}
export type TriggerOptions = {
  type?: MenuType;
  xDir?: DirectionX;
  yDir?: DirectionY;
  debounce?: number;
}

export type MenuInit = (element: HTMLElement) => {
  update: () => void;
  destroy: () => void;
};

export type MenuTrigger = (element: HTMLElement, options?: TriggerOptions) => {
  update: (options?: TriggerOptions) => void;
  destroy: () => void
};

export type MenuItem = (element: HTMLElement, data: unknown) => {
  update: (data: unknown) => void;
  destroy: () => void;
};

export enum MenuEventType {
  OPEN = 'menu:open',
  CLOSE = 'menu:close',
  SELECT = 'menu:select',
}

export type MenuEventListener = (e: CustomEvent) => void;

export type MenuState = State<{
  open: boolean;
  type: MenuType;
  menu: MenuInit;
  trigger: MenuTrigger;
  item: MenuItem;
  show: (e?: MouseEvent) => void;
  hide: (e?: MouseEvent) => void;

  addEventListener: (type: MenuEventType, cb: MenuEventListener) => void;
  removeEventListener: (type: MenuEventType, cb: MenuEventListener) => void;
}>;

export function createMenu(options?: MenuOptions): MenuState {
  let { type: menuType = 'dropdown' } = (options || {} as MenuOptions);
  const { portal = '.menu-portal', backdrop = false } = (options || {} as MenuOptions);

  let root: HTMLElement;
  let button: HTMLElement;

  const items: HTMLElement[] = [];
  const dataMap = new Map<HTMLElement, unknown>();

  const dispatch = (type: MenuEventType, detail?: unknown) => {
    root?.dispatchEvent(new CustomEvent(type, { detail }));
  };

  const menu: MenuInit = (element: HTMLElement) => {
    root = element;

    const keydown = (e: KeyboardEvent) => {
      if (!root || !state.open) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();

        const i = items.indexOf(e.target as HTMLElement);
        const prev = items[i - 1];

        if (prev) {
          prev.focus();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopImmediatePropagation();

        const i = items.indexOf(e.target as HTMLElement);
        const next = items[i + 1];

        if (next) {
          next.focus();
        }
      }
    };

    const hook = arrows(element, keydown);

    return {
      update: () => undefined,
      destroy: () => {
        hook?.destroy?.();
      },
    };
  };

  const trigger: MenuTrigger = (element: HTMLElement, options?: TriggerOptions) => {
    if (options?.type) {
      menuType = options.type;
      state.type = menuType;
    }

    button = element;
    button.addEventListener(menuType === 'context' ? 'contextmenu' : 'click', show);

    return {
      update: (opt?: TriggerOptions) => {
        if (opt?.type) {
          button.removeEventListener(menuType === 'context' ? 'contextmenu' : 'click', show);

          menuType = opt.type;
          state.type = menuType;

          button.addEventListener(menuType === 'context' ? 'contextmenu' : 'click', show);
        }
      },
      destroy: () => {
        button.removeEventListener(menuType === 'context' ? 'contextmenu' : 'click', show);
      },
    };
  };

  const item: MenuItem = (element: HTMLElement, data: unknown) => {
    items.push(element);
    dataMap.set(element, data);

    const itemMouseUp = (e: MouseEvent) => {
      select(e, data);
    };

    const itemKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Space') {
        select(e, data);
      }
    };

    element.addEventListener('mouseup', itemMouseUp);
    element.addEventListener('keydown', itemKeydown);

    return {
      update: (data: unknown) => {
        dataMap.set(element, data);
      },
      destroy: () => {
        dataMap.delete(element);

        if (items.includes(element)) {
          items.splice(items.indexOf(element), 1);
        }

        element.removeEventListener('mouseup', itemMouseUp);
        element.removeEventListener('keydown', itemKeydown);
      },
    };
  };

  const select = (e: MouseEvent | KeyboardEvent, data?: unknown) => {
    if (!root) return;

    root.dispatchEvent(new CustomEvent('menu:select', { detail: data }));
    hide();
  };

  let outsider: Outsider | void;
  let escaper: Escaper | void;
  let parent: HTMLElement | void;
  let backdropElement: HTMLElement | void;

  const show = (e?: MouseEvent) => {
    if (!root) return;

    state.open = true;
    parent = root.parentElement as HTMLElement;

    let target: HTMLElement = (typeof (portal as string) === 'string'
                               ? document.querySelector(portal as string)
                               : portal) as HTMLElement;

    if (!target) {
      target = document.createElement('div');
      target.classList.add('menu-portal');
      document.body.appendChild(target);
    }

    if (backdrop) {
      backdropElement = document.createElement('div');
      backdropElement.classList.add('menu-backdrop');
      backdropElement.addEventListener('click', hide);

      target.appendChild(backdropElement);
    }

    target.appendChild(root);
    root.focus();

    if (menuType === 'context') {
      e?.preventDefault();
      e?.stopPropagation();

      const { width, height } = root.getBoundingClientRect();
      const { clientX: x, clientY: y } = e || { clientX: 0, clientY: 0 };

      root.style.left = `${ x + width > innerWidth ? innerWidth - width : x }px`;
      root.style.top = `${ y + height > innerHeight ? innerHeight - height : y }px`;
    }

    outsider = outside(root, hide);
    escaper = escape(root, hide);

    root.dispatchEvent(new CustomEvent('menu:open', { detail: { e } }));
  };

  const hide = () => {
    if (!root) return;

    state.open = false;

    (parent as HTMLElement)?.appendChild(root);
    (outsider as Outsider)?.destroy();
    (escaper as Escaper)?.destroy();
    (backdropElement as HTMLElement)?.remove();

    outsider = undefined;
    escaper = undefined;
    parent = undefined;

    root.dispatchEvent(new CustomEvent('menu:close'));
  };

  const addEventListener = (type: MenuEventType, cb: MenuEventListener) => {
    root.addEventListener(`menu:${ type }` as never, cb);
  };
  const removeEventListener = (type: MenuEventType, cb: MenuEventListener) => {
    root.removeEventListener(`menu:${ type }` as never, cb);
  };

  const state = anchor({
    open: options?.open || false,
    type: menuType,
    menu,
    trigger,
    item,
    show,
    hide,
    addEventListener,
    removeEventListener,
  });
  return state;
}
