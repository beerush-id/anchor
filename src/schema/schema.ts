export enum SchemaType {
  Array = 'array', // Test Covered.
  Boolean = 'boolean', // Test Covered.
  Custom = 'custom', // Test Covered.
  Date = 'date', // Test Covered.
  Map = 'map',
  Null = 'null', // Test Covered.
  Number = 'number', // Test Covered.
  Object = 'object', // Test Covered.
  RegExp = 'regexp',
  Set = 'set',
  String = 'string', // Test Covered.
}

export type SchemaTypeOf<T> = T extends unknown[]
  ? SchemaType.Array
  : T extends Set<unknown>
    ? SchemaType.Set
    : T extends Map<unknown, unknown>
      ? SchemaType.Map
      : T extends Date
        ? SchemaType.Date
        : T extends object
          ? SchemaType.Object
          : T extends boolean
            ? SchemaType.Boolean
            : T extends string
              ? SchemaType.String
              : T extends number
                ? SchemaType.Number
                : T extends null
                  ? SchemaType.Null
                  : SchemaType.Custom;

export const COMMON_SCHEMA_TYPES: SchemaType[] = Object.values(SchemaType);
export const SERIALIZABLE_SCHEMA_TYPES: SchemaType[] = [
  SchemaType.Array,
  SchemaType.Boolean,
  SchemaType.Date,
  SchemaType.Null,
  SchemaType.Number,
  SchemaType.Object,
  SchemaType.String,
];

export type SchemaCustomValidation = {
  valid: boolean;
  expected: unknown;
};

export type BaseSchema<T> = {
  type: SchemaTypeOf<T> | SchemaTypeOf<T>[] | SchemaType;
  title?: string;
  readonly?: boolean;
};

// Primitive Types
export type BooleanSchema = {
  required?: boolean;
  default?: boolean | (() => boolean);
};
export type StringSchema = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  strict?: boolean;
  default?: string | (() => string);
  enum?: string[];
  validate?: (value: string) => SchemaCustomValidation;
};
export type NumberSchema = {
  required?: boolean;
  minimum?: number;
  maximum?: number;
  default?: number | (() => number);
  enum?: number[];
  validate?: (value: number) => SchemaCustomValidation;
};
export type NullSchema = {
  required?: boolean;
};

// Object Types
export type ObjectSchema<T> = {
  properties?: {
    [P in keyof T]: Schema<T[P]> | (() => Schema<T[P]>);
  };
  required?: Array<keyof T>;
  additionalProperties?: boolean;
  default?: () => T;
  validate?: (value: T) => SchemaCustomValidation;
};
export type MapSchema<K, V> = {
  keys?: Schema<K> | (() => Schema<K>);
  items?: Schema<V> | (() => Schema<V>);
  default?: () => Map<K, V>;
  validate?: (value: V) => SchemaCustomValidation;
};

export type ArraySchema<T> = {
  items?: Schema<T> | (() => Schema<T>);
  required?: boolean;
  additionalItems?: boolean;
  default?: () => T[];
  validate?: (value: T[]) => SchemaCustomValidation;
};
export type SetSchema<T> = {
  items?: Schema<T> | (() => Schema<T>);
  required?: boolean;
  additionalItems?: boolean;
  default?: () => Set<T>;
  validate?: (value: T[]) => SchemaCustomValidation;
};
export type DateSchema = {
  required?: boolean;
  default?: string | number | (() => Date);
  minDate?: Date;
  maxDate?: Date;
  validate?: (value: Date) => SchemaCustomValidation;
};

// Custom Types
export type CustomSchema<T> = {
  required?: boolean;
  default?: () => T;
  validate?: (value: T) => SchemaCustomValidation;
};

export type Schema<T> = BaseSchema<T> &
  (T extends Array<SchemaType>
    ? Schema<T[number]>
    : T extends Array<infer U>
      ? ArraySchema<U>
      : T extends Set<infer U>
        ? SetSchema<U>
        : T extends Map<infer K, infer V>
          ? MapSchema<K, V>
          : T extends Date
            ? DateSchema
            : T extends object
              ? ObjectSchema<T>
              : T extends boolean
                ? BooleanSchema
                : T extends string
                  ? StringSchema
                  : T extends number
                    ? NumberSchema
                    : T extends null
                      ? NullSchema
                      : CustomSchema<T>);

export enum SchemaErrorType {
  Type = 'typerror',
  Value = 'valueerror',
}

export enum SchemaErrorKey {
  Minimum = 'minimum',
  Maximum = 'maximum',
  MinLength = 'minLength',
  MaxLength = 'maxLength',
}

export type SchemaBaseError = {
  message: string;
  key?: SchemaErrorKey;
  path?: string;
};
export type SchemaTypeError = {
  type: SchemaErrorType.Type;
  expected: string | string[];
  actual: string;
};
export type SchemaValueError = {
  type: SchemaErrorType.Value;
  expected: unknown;
  actual: unknown;
};
export type SchemaError<T extends SchemaErrorType> = SchemaBaseError &
  (T extends SchemaErrorType.Type ? SchemaTypeError : SchemaValueError);

export type FieldValidation = {
  __valid: boolean;
  __errors: SchemaError<SchemaErrorType>[];
};

export type ValidationType<T> = T extends unknown[]
  ? Array<ValidationType<T[number]>>
  : T extends object
    ? { [K in keyof T]: ValidationType<T[K]> } & FieldValidation
    : T & FieldValidation;

export type ObjectValidation<T> = {
  properties: ValidationType<T>;
};

export type ArrayValidation<T> = {
  items: ValidationType<T>;
};

export type SchemaValidation = {
  valid: boolean;
  errors: SchemaError<SchemaErrorType>[];
  error?: Error;
};

export type DetailedValidation<T> = T extends Array<infer U> | Set<infer U>
  ? SchemaValidation & ArrayValidation<U>
  : T extends object | Map<unknown, unknown>
    ? SchemaValidation & ObjectValidation<T>
    : SchemaValidation;

export function flattenSchema<T>(schema: Schema<T> | (() => Schema<T>)): Schema<T> {
  if (typeof schema === 'function') {
    return schema();
  }

  return schema;
}
