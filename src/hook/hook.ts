import type { Anchor, Init, Rec, State } from '../core/anchor.js';
import { crate, Pointer } from '../core/anchor.js';
import { persistent, session } from '../core/store.js';
import { logger } from '@beerush/utils';
import { Stream, StreamPublisher } from '../api/index.js';
import { history, type History, StateChanges } from '../core/history.js';

export type StateHook = (init: Init) => [ object, (value: object) => void ];
export type EffectHook = (fn: () => (void | never), deps?: unknown) => void;
export type RefHook = <T extends Init>(init: T) => {
  current?: Anchor<T>;
};

export type InputRef = {
  current: never | null;
  valid?: boolean;
  touched?: boolean;
  destroy: () => void,
  update: (value: unknown) => void,
  validate: () => void,
};
export type InputRefs<T extends Rec> = { [K in keyof T]: InputRef };
export type InputValidators<T extends Rec> = { [K in keyof T]?: (value: T[K]) => boolean }
export type UpstreamRef<T extends Rec> = [ InputRefs<T>, StreamPublisher<T>, State<T>, Stream<T> ];
export type UpsertRef<T extends Rec> = [ InputRefs<T>, StreamPublisher<T>, History<T>, State<T>, StateChanges<T>, Stream<T> ];
export type HistoryRef<T extends Init> = [ State<T>, StateChanges<T>, History<T> ];

let useState: StateHook;
let useEffect: EffectHook;
let useRef: RefHook;

export function useCrate<T extends Init>(init: T): Anchor<T>;
export function useCrate<T extends Init>(init: T, r: false): Anchor<T, false>;
export function useCrate<T extends Init>(init: T, r = true): Anchor<T> {
  const ref: { current: Anchor<T> } = useRef(null as never) as never;

  if (!ref.current) {
    ref.current = crate(init as Init, r) as never;
    logger.debug('[anchor:use-crate] Crate created.');
  }

  registerHook(ref.current[Pointer.STATE] as never);

  return ref.current;
}

export function useAnchor<T extends Init>(init: T): State<T>;
export function useAnchor<T extends Init>(init: T, r: false): State<T, false>;
export function useAnchor<T extends Init>(init: T, r = true): State<T> {
  return useCrate(init, r as false)[Pointer.STATE] as never;
}

export function usePersistent<T extends Init>(name: string, init: T): State<T>;
export function usePersistent<T extends Init>(name: string, init: T, r: true, v?: string): State<T>;
export function usePersistent<T extends Init>(name: string, init: T, r: false, v?: string): State<T, false>;
export function usePersistent<T extends Init>(name: string, init: T, r = true, v = '1.0.0'): State<T> {
  const state = persistent(name, init, r as false, v) as never;
  registerHook(state);
  return state;
}

export function useSession<T extends Init>(name: string, init: T): State<T>;
export function useSession<T extends Init>(name: string, init: T, r: true, v?: string): State<T>;
export function useSession<T extends Init>(name: string, init: T, r: false, v?: string): State<T, false>;
export function useSession<T extends Init>(name: string, init: T, r = true, v = '1.0.0'): State<T> {
  const state = session(name, init, r as false, v) as never;
  registerHook(state);
  return state;
}

usePersistent.crate = <T extends Init>(name: string, init: T, recursive = true): Anchor<T> => {
  const anchor = persistent.crate(name, init, recursive as false);
  registerHook(anchor[Pointer.STATE] as never);
  return anchor;
};
useSession.crate = <T extends Init>(name: string, init: T, recursive = true): Anchor<T> => {
  const anchor = session.crate(name, init, recursive as false);
  registerHook(anchor[Pointer.STATE] as never);
  return anchor;
};

export function useInput<T extends Rec>(init: T, validate?: InputValidators<T>): [ State<T>, InputRefs<T> ] {
  const steps: { current: InputRefs<T> } = useRef(null as never) as never;
  const state: State<T> = useAnchor(init);
  const [ , setState ] = useState(init);

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
                  if ([ 'checkbox', 'radio' ].includes(elementRef.type)) {
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
                if ([ 'checkbox', 'radio' ].includes(elementRef.type) && elementRef.checked !== value) {
                  elementRef.checked = value as never;
                  input.validate();
                  setState({ ...state });

                  logger.debug('[anchor:use-input] Internal input updated.');
                } else if (elementRef.value !== value) {
                  elementRef.value = value as never;
                  input.validate();
                  setState({ ...state });

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
                setState({ ...state });
                logger.debug('[anchor:use-input] Input touched but invalid.');
              }
            }

            if (elementRef) {
              input.validate();

              if ([ 'checkbox', 'radio' ].includes(elementRef.type)) {
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

  return [ state, steps.current ];
}

export function useStream<T extends Init>(stream: Stream<T>): Stream<T> {
  ensureHooks();

  const [ , setState ] = useState(stream);

  useEffect(() => {
    stream.fetch?.();

    logger.debug('[anchor:use-stream] Fetching initial Stream.');

    return stream.subscribe((s) => {
      setState(Array.isArray(s) ? [ ...s ] : { ...s });
      logger.debug('[anchor:use-stream] Stream updated.');
    }, false);
  }, []);

  return stream;
}

export function useUpstream<T extends Rec>(stream: Stream<T>, validate?: InputValidators<T>): UpstreamRef<T> {
  const [ state, ref ] = useInput<T>(stream.data as never, validate);
  const [ , setState ] = useState(stream);

  useEffect(() => {
    logger.debug('[anchor:use-upstream] Ready for submitting Stream.');

    return stream.subscribe((s, e) => {
      setState(Array.isArray(s) ? [ ...s ] : { ...s });
      logger.debug('[anchor:use-upstream] Stream updated.', e);
    }, false);
  }, []);

  return [ ref, stream.fetch, state, stream ];
}

export function useHistory<T extends Init>(state: State<T>, max?: number, deb?: number, a = true): HistoryRef<T> {
  ensureHooks();

  const ref: { current: History<T> } = useRef(null as never) as never;

  if (!ref.current) {
    ref.current = history<T>(state, max, deb);
    logger.debug('[anchor:use-history] History created.');
  }

  if (a) {
    const [ , setState ] = useState(state);

    useEffect(() => {
      return ref.current.subscribe((s, e) => {
        setState(Array.isArray(state) ? [ ...state ] : { ...state });
        logger.debug('[anchor:use-history] History changed.', e);
      }, false);
    }, []);
  }

  return [ state, ref.current.changes, ref.current ];
}

export function useUpsert<T extends Rec>(stream: Stream<T>, validate?: InputValidators<T>): UpsertRef<T> {
  const [ state, changes, rec ] = useHistory<T>(stream.data as never, undefined, undefined, false);
  const [ , ref ] = useInput(stream.data as never, validate);

  stream.data = changes as never;

  const [ , setState ] = useState(stream);

  useEffect(() => {
    logger.debug('[anchor:use-upsert] Ready for submitting Stream.');

    return stream.subscribe((s, e) => {
      setState({ ...stream });
      logger.debug('[anchor:use-upsert] Stream updated.', e);
    }, false);
  }, []);

  return [ ref, stream.fetch, rec, state, changes, stream ];
}

export function setAnchorHook(hook: unknown, effect: unknown, ref: unknown) {
  useState = hook as never;
  useEffect = effect as never;
  useRef = ref as never;
}

function registerHook(state: State<Init>) {
  ensureHooks();

  const [ , setState ] = useState(state);

  useEffect(() => {
    return state.subscribe((s) => {
      setState(Array.isArray(s) ? [ ...s ] : { ...s });
      logger.debug('[anchor:use-anchor] Anchor updated.');
    }, false);
  }, []);

  return state;
}

function ensureHooks() {
  if (typeof useState !== 'function') {
    throw new Error('Anchor hook is not set.');
  }
  if (typeof useEffect !== 'function') {
    throw new Error('Anchor effect is not set.');
  }
  if (typeof useRef !== 'function') {
    throw new Error('Anchor ref is not set.');
  }
}
