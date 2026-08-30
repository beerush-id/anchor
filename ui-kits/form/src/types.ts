import type { output, ZodObject, ZodType } from 'zod';
import type { FORM_STATUS } from './constant.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export type AnyType = any;
export type FormDataMap = Record<string, AnyType>;
export type FormErrorMap = Record<string, string[]>;

export type SchemaMap = {
  type: string;
  shape: ZodType;
  builder: ZodType;
  required: boolean;
};

export type FormStatus = (typeof FORM_STATUS)[keyof typeof FORM_STATUS];

export type FormStateOptions = {
  strict?: boolean;
  validateOnInit?: boolean;
  settleOnSubmit?: boolean;
  shallowChange?: boolean;
  onChange?: (data: FormDataMap, errors: FormErrorMap) => void;
};

export type FormContextStore = {
  status: FormStatus;
  error?: Error;
  errors: Record<string, string[]>;
  changes: Record<string, AnyType>;
  touched: boolean;
};

export type FormSubmitHandler<T extends ZodObject> = (
  data: output<T>,
  changes: Partial<output<T>>
) => Promise<void> | void;

export type FormEvent<T extends ZodObject> =
  | {
      type: 'reset' | 'clear';
    }
  | {
      type: 'change';
      path: string;
      value: AnyType;
    }
  | {
      type: 'submit';
      data: output<T>;
      changes: Partial<output<T>>;
    };

type Primitive = null | undefined | string | number | boolean | symbol | bigint | Date;
type IsTuple<T extends ReadonlyArray<AnyType>> = number extends T['length'] ? false : true;
type TupleKeys<T extends ReadonlyArray<AnyType>> = Exclude<keyof T, keyof AnyType[]>;

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5];

export type DeepPaths<T, D extends number = 4> = [D] extends [never]
  ? never
  : T extends Primitive
    ? never
    : T extends ReadonlyArray<infer V>
      ? IsTuple<T> extends true
        ? {
            [K in TupleKeys<T>]-?: K extends string | number ? `${K}` | Join<K, DeepPaths<T[K], Prev[D]>> : never;
          }[TupleKeys<T>]
        : `${number}` | Join<`${number}`, DeepPaths<V, Prev[D]>>
      : T extends object
        ? { [K in keyof T]-?: K extends string | number ? `${K}` | Join<K, DeepPaths<T[K], Prev[D]>> : never }[keyof T]
        : never;

export type PathValue<T, P> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : T extends ReadonlyArray<infer V>
      ? K extends `${number}`
        ? PathValue<V, Rest>
        : never
      : never
  : P extends keyof T
    ? T[P]
    : T extends ReadonlyArray<infer V>
      ? P extends `${number}`
        ? V
        : never
      : never;

export type FormFields<T> = {
  [K in DeepPaths<T> | keyof T]: PathValue<T, K>;
};

export type FormErrors<T> = {
  [K in DeepPaths<T> | keyof T]?: string[];
};

export type ContextReader = <T>(key: symbol) => T | undefined;
export type ContextWriter = (key: symbol, value: AnyType) => void;

export type ContextBridge = {
  read: ContextReader;
  write: ContextWriter;
};
