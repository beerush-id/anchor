import type { ReactNode, RefObject } from 'react';
import type { Bindable, ReactiveProps, VariableRef } from '../index.ts';
import type { WritableKeys } from '@anchorlib/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InitProps = { [key: string]: any };

export type TextBinding = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search' | 'color' | 'time';
export type NumberBinding = 'number' | 'range';
export type BooleanBinding = 'checkbox' | 'radio';
export type BindingType = TextBinding | NumberBinding | BooleanBinding | 'file' | 'date';

export type BindingKeys<Value, Binding extends Bindable> =
  WritableKeys<Binding> extends infer K
    ? K extends keyof Binding
      ? Binding[K] extends Value
        ? K
        : never
      : never
    : never;

// Base binding props that are common to all binding types
type BaseBindingProps<Kind extends BindingType, Props extends InitProps> = ReactiveProps<Props> & {
  type?: Kind;
  ref?: RefObject<unknown>;
};

// Variable binding (using VariableRef)
export type VariableBindingProps<
  Kind extends BindingType = 'text',
  Props extends InitProps = InitProps,
> = BaseBindingProps<Kind, Props> & {
  bind: VariableRef<GetValueByBindingType<Kind>>;
};

// State binding with prop
export type StateFlatBindingProps<
  Kind extends BindingType = 'text',
  Binding extends Bindable = Bindable,
  Props extends InitProps = InitProps,
> = BaseBindingProps<Kind, Props> & {
  bind: Binding;
  prop: BindingKeys<GetValueByBindingType<Kind>, Binding>;
};

// State binding with name (for backward compatibility)
export type StateFlexBindingProps<
  Kind extends BindingType = 'text',
  Binding extends Bindable = Bindable,
  Props extends InitProps = InitProps,
> = BaseBindingProps<Kind, Props> & {
  bind: Binding;
  name: BindingKeys<GetValueByBindingType<Kind>, Binding>;
};

// Helper type to get the value type based on the binding type
export type GetValueByBindingType<Kind extends BindingType> = Kind extends NumberBinding
  ? number | undefined
  : Kind extends BooleanBinding
    ? boolean | undefined
    : Kind extends 'date'
      ? Date | undefined
      : Kind extends 'file'
        ? FileList | undefined
        : string | undefined;

// Union of all possible binding props
export type InputBindingProps<
  Kind extends BindingType = 'text',
  Binding extends Bindable = Bindable,
  Props extends InitProps = InitProps,
> =
  | VariableBindingProps<Kind, Props>
  | StateFlatBindingProps<Kind, Binding, Props>
  | StateFlexBindingProps<Kind, Binding, Props>;

export interface InputBinding<Props extends InitProps = InitProps> {
  (props: Props): ReactNode;
  <Bind extends VariableRef<unknown> | Bindable, Kind extends BindingType = 'text'>(
    props: Bind extends VariableRef<unknown>
      ? VariableBindingProps<Kind, Props>
      : StateFlatBindingProps<Kind, Bind, Props>
  ): ReactNode;
  <Bind extends VariableRef<unknown> | Bindable, Kind extends BindingType = 'text'>(
    props: Bind extends VariableRef<unknown>
      ? VariableBindingProps<Kind, Props>
      : StateFlexBindingProps<Kind, Bind, Props>
  ): ReactNode;
  <Kind extends BindingType = 'text'>(props: VariableBindingProps<Kind, Props>): ReactNode;
}
