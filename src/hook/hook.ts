import type { Anchor, Init, State } from '../core/anchor.js';
import { crate, Pointer } from '../core/anchor.js';
import { logger } from '../utils/index.js';
import type { Rec } from '../core/base.js';
import type { Sealed } from '../core/seal.js';
import type { MemoryOptions, PersistentOptions, SessionOptions } from '../store/index.js';
import { memoryState, persistentState, sessionState } from '../store/index.js';
import { type HistoryOptions, type HistoryState, stateHistory } from '../history/index.js';

export type StateHook = <T>(init: T) => [T, (value: T) => void];
export type EffectHook = (fn: () => void | never, deps?: unknown) => void;
export type RefHook = <T>(init?: T) => {
  current?: T;
};

export type InputRef = {
  current: never | null;
  valid?: boolean;
  touched?: boolean;
  destroy: () => void;
  update: (value: unknown) => void;
  validate: () => void;
};
export type InputRefs<T extends Rec> = { [K in keyof T]: InputRef };
export type InputValidators<T extends Rec> = { [K in keyof T]?: (value: T[K]) => boolean };

let _useState: StateHook;
let _useEffect: EffectHook;
let _useRef: RefHook;

export const useState: StateHook = ((init: Init) => {
  return _useState ? _useState(init) : init;
}) as never;
export const useEffect: EffectHook = (fn: () => void | never, deps?: unknown) => {
  return _useEffect ? _useEffect(fn, deps) : fn();
};
export const useRef: RefHook = ((init: Init) => {
  return _useRef ? _useRef(init) : { current: init };
}) as never;

export function useCrate<T extends Init>(init: T): Anchor<T>;
export function useCrate<T extends Init, R extends boolean = true>(
  init: T,
  recursive: R,
  strict?: boolean
): Anchor<T, R>;
export function useCrate<T extends Init>(init: T, recursive = true, strict?: boolean): Anchor<T> {
  const ref: { current: Anchor<T> } = useRef(null as never) as never;

  if (!ref.current) {
    ref.current = crate(init as Init, recursive, strict) as never;
    logger.debug('[anchor:use-crate] Crate created.');
  }

  registerHook(ref.current[Pointer.STATE] as never);

  return ref.current;
}

export function useAnchor<T extends Init>(init: T): State<T>;
export function useAnchor<T extends Init, R extends boolean = true>(
  init: T,
  recursive: R,
  strict?: boolean
): State<T, R>;
export function useAnchor<T extends Init>(init: T, recursive = true, strict?: boolean): State<T> {
  return useCrate(init, recursive, strict)[Pointer.STATE] as never;
}

export function useMemory<T extends Init, R extends boolean = true>(
  name: string,
  init: T,
  options: MemoryOptions<T>
): State<T, R> {
  const state = memoryState(name, init, options) as never;
  registerHook(state);
  return state;
}

export function usePersistent<T extends Sealed, R extends boolean = true>(
  name: string,
  init: T,
  options: PersistentOptions<T>
): State<T, R> {
  const state = persistentState(name, init, options) as never;
  registerHook(state);
  return state;
}

export function useSession<T extends Init, R extends boolean = true>(
  name: string,
  init: T,
  options: SessionOptions<T>
): State<T, R> {
  const state = sessionState(name, init, options) as never;
  registerHook(state);
  return state;
}

export function useInput<T extends Rec>(init: T, validate?: InputValidators<T>): [State<T>, InputRefs<T>] {
  const steps: { current: InputRefs<T> } = useRef(null as never) as never;
  const state: State<T> = useAnchor(init);
  const [, setState] = useState(init);

  if (!steps.current) {
    steps.current = new Proxy({} as never, {
      get(target, key) {
        let input: InputRef = Reflect.get(target, key);

        if (!input) {
          let elementRef: HTMLInputElement;

          input = {
            get current(): HTMLInputElement | void {
              return elementRef;
            },
            set current(element: HTMLInputElement | void) {
              if (elementRef !== element) {
                if (elementRef) {
                  elementRef.removeEventListener('blur', onInput as never);
                  elementRef.removeEventListener('input', onInput as never);

                  logger.debug('[anchor:use-input] Leaving current input.');
                }

                elementRef = element as never;

                if (elementRef) {
                  if (['checkbox', 'radio'].includes(elementRef.type)) {
                    elementRef.checked = (state[key as keyof State<T>] ?? '') as never;
                  } else {
                    elementRef.value = (state[key as keyof State<T>] ?? '') as never;
                  }

                  elementRef.addEventListener('blur', onInput as never);
                  elementRef.addEventListener('input', onInput as never);

                  logger.debug('[anchor:use-input] Input element changed.');
                }
              }
            },
            destroy: () => {
              if (elementRef) {
                elementRef.removeEventListener('blur', onInput as never);
                elementRef.removeEventListener('input', onInput as never);
                logger.debug('[anchor:use-input] Input destroyed.');
              }
            },
            update: (value: unknown) => {
              if (elementRef) {
                if (['checkbox', 'radio'].includes(elementRef.type) && elementRef.checked !== value) {
                  elementRef.checked = value as never;
                  input.validate();
                  setState({ ...state } as never);

                  logger.debug('[anchor:use-input] Internal input updated.');
                } else if (elementRef.value !== value) {
                  elementRef.value = value as never;
                  input.validate();
                  setState({ ...state } as never);

                  logger.debug('[anchor:use-input] Internal input updated.');
                }
              }
            },
            validate: () => {
              if (elementRef.required) {
                if (typeof validate?.[key as keyof T] === 'function') {
                  input.valid = validate[key as keyof T]?.(elementRef.value as never);
                } else {
                  input.valid = !(!elementRef.value && !elementRef.checked);
                }
              }
            },
            valid: !!state[key as keyof State<T>],
            touched: false,
          } as never;

          const onInput = (event: KeyboardEvent | MouseEvent) => {
            if (event.type === 'blur' && !input.touched) {
              input.touched = true;

              if (!input.valid) {
                setState({ ...state } as never);
                logger.debug('[anchor:use-input] Input touched but invalid.');
              }
            }

            if (elementRef) {
              input.validate();

              if (['checkbox', 'radio'].includes(elementRef.type)) {
                state[key as keyof State<T>] = elementRef?.checked as never;
              } else {
                state[key as keyof State<T>] = elementRef?.value as never;
              }
            }
          };

          Reflect.set(target, key, input);
        }

        return input;
      },
    });
  }

  useEffect(() => {
    return state.subscribe((s, event) => {
      const input: InputRef = steps.current?.[event?.path as keyof T];

      if (input && event) {
        input.update(event.value);
      }
    }, false);
  }, []);

  return [state, steps.current];
}

export function useHistory<T extends Init>(state: State<T>, options: HistoryOptions): HistoryState<T> {
  const value = stateHistory(state as never, options);
  registerHook(value as never);
  return value as never;
}

export function setAnchorHook(hook: unknown, effect: unknown, ref: unknown) {
  _useState = hook as never;
  _useEffect = effect as never;
  _useRef = ref as never;
}

function registerHook(state: State<Init>) {
  ensureHooks();

  const [, setState] = useState(state);

  useEffect(() => {
    return state.subscribe((s) => {
      setState((Array.isArray(s) ? [...s] : { ...s }) as never);
      logger.debug('[anchor:use-anchor] Anchor updated.');
    }, false);
  }, []);

  return state;
}

function ensureHooks() {
  if (typeof _useState !== 'function') {
    throw new Error('Anchor hook is not set.');
  }
  if (typeof _useEffect !== 'function') {
    throw new Error('Anchor effect is not set.');
  }
  if (typeof _useRef !== 'function') {
    throw new Error('Anchor ref is not set.');
  }
}
