import { Sealed } from './seal.js';
import { anchor, Beacon, ExternalSubscriptions, Sail } from './anchor.js';
import { Schema, SchemaError, SchemaErrorType, validate } from '../schema/index.js';

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

export function inspectSchema<T extends Sealed>(schema: Schema<T>, value: T | Sail<T>): Inspector<T> {
  const state = anchor(value);
  const validation = anchor(validate(schema, value));
  const subscribers = ExternalSubscriptions.get(state);

  const listen: Beacon<T> = (s, e) => {
    console.log(s, e);
  };

  if (subscribers) {
    subscribers.add(listen as never);
  }

  return {} as never;
}
