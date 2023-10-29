import { Sealed } from './seal.js';
import { anchor, ExternalSubscriptions, State } from './anchor.js';
import { Schema, SchemaError, SchemaErrorType, validate } from '../schema/index.js';
import { Subscriber } from './base.js';

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

export function inspectSchema<T extends Sealed>(schema: Schema<T>, value: T | State<T>): Inspector<T> {
  const state = anchor(value);
  const validation = anchor(validate(schema, value));
  const subscribers = ExternalSubscriptions.get(state);

  const listen: Subscriber<T> = (s, e) => {
    console.log(s, e);
  };

  if (subscribers) {
    subscribers.add(listen as never);
  }

  return {} as never;
}
