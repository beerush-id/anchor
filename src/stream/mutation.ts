import type { Stream, StreamPublisher } from './remote.js';
import type { Init, State } from '../core/anchor.js';
import { History, history } from '../core/history.js';
import { Rec, writable } from '../core/base.js';
import { logger } from '../utils/index.js';

export type FormInput<T> = {
  _value: T;
  _valid: boolean;
  _touched: boolean;
}
export type FormControl<T> = {
  [K in keyof T]: T[K] extends Init ? FormInput<T[K]> & FormControl<T[K]> : FormInput<T[K]>;
}
export type Mutation<T extends Init> = [ State<T>, StreamPublisher<T>, History<T>, Stream<T> ];
export type Validation<T extends Init> = {
  [K in keyof T]?: (value: T[K]) => boolean;
}

const ref: FormControl<{
  email: string;
  password: string;
  location: {
    city: string;
    country: string;
  }
}> = {} as never;

export function mutation<T extends Init>(stream: Stream<T>, validation?: Validation<T>): Mutation<T> {
  const record = history<T>(stream.data);

  stream.data = record.changes as never;

  return [ record.state, stream.fetch, record, stream ];
}

function input<T extends Init>(state: State<T>, init: T, validation?: Validation<T>): FormControl<T> {
  const instance = writable(init);

  return new Proxy(instance, {
    get(target: T, p: string) {
      let ref: FormInput<T[keyof T]> = Reflect.get(target, p) as never;

      if (typeof ref === 'undefined') {
        const data = state as Rec;

        ref = input(data[p] as never, {
          set _value(value: T[keyof T]) {
            data[p as never] = value as never;

            // if (validation && validation[p]) {
            //   ref._valid = validation[p](value);
            // } else {
            //   ref._valid = typeof value !== 'undefined' && value !== null;
            // }
          },
          get _value(): T[keyof T] {
            return data[p] as never;
          },
          _valid: false,
          _touched: false,
        }) as never;

        Reflect.set(target, p, ref);
      }

      return ref;
    },
    set(target: T, p: string): boolean {
      logger.error(
        '[anchor:mutation] Form control are read-only!',
        `Please use the _value property to update the value of a form control ${ p }.`,
      );

      return false;
    },
  } as never) as never;
}
