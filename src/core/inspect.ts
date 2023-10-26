import { Sealed } from './seal.js';
import { Beacon, crate, ExternalSubscriptions, Pointer, Sail } from './anchor.js';
import { SchemaError, SchemaErrorType } from '../schema/index.js';

interface Validation {
  __valid: boolean,
  __errors: SchemaError<SchemaErrorType>[],
}

type ValidationType<T> = T extends unknown[]
                         ? Array<ValidationType<T[number]>>
                         : T extends object
                           ? { [K in keyof T]: ValidationType<T[K]> } & Validation
                           : T & Validation;

export type Inspector<T> = {
  valid: boolean;
  errors: SchemaError<SchemaErrorType>[];
  detail: ValidationType<T>;
}

export function inspect<T extends Sealed>(value: T | Sail<T>): Inspector<T> {
  const instance = crate(value);
  const state = instance[Pointer.STATE];
  const subscribers = ExternalSubscriptions.get(state);

  const listen: Beacon<T> = (s, e) => {
    console.log(s, e);
  };

  if (subscribers) {
    subscribers.add(listen as never);
  }

  return {} as never;
}
