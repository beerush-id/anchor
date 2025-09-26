import type { ReactNode, RefObject } from 'react';
import type { Bindable, ReactiveProps, VariableRef } from '@base/index.ts';
import type { WritableKeys } from '@anchorlib/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InitProps = { [key: string]: any };

export type TextBinding = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search' | 'color' | 'time';
export type NumberBinding = 'number' | 'range';
export type BooleanBinding = 'checkbox' | 'radio';
export type BindingType = TextBinding | NumberBinding | BooleanBinding | 'file' | 'date';

export type VariableBinding<Value, Kind extends BindingType, Props extends InitProps> = ReactiveProps<Props> & {
  bind: VariableRef<Value>;
  type?: Kind;
  ref?: RefObject<unknown>;
};

export type BindingKeys<Value, Binding extends Bindable> =
  WritableKeys<Binding> extends infer K
    ? K extends keyof Binding
      ? Binding[K] extends Value
        ? K
        : never
      : never
    : never;
export type StateFlexBinding<
  Value,
  Kind extends BindingType,
  Binding extends Bindable,
  Props extends InitProps,
> = ReactiveProps<Props> & {
  bind: Binding;
  name: BindingKeys<Value, Binding>;
  type?: Kind;
  ref?: RefObject<unknown>;
};
export type StateFlatBinding<
  Value,
  Kind extends BindingType,
  Binding extends Bindable,
  Props extends InitProps,
> = ReactiveProps<Props> & {
  bind: Binding;
  bindKey: BindingKeys<Value, Binding>;
  type?: Kind;
  ref?: RefObject<unknown>;
};
export type StateBinding<Value, Kind extends BindingType, Binding extends Bindable, Props extends InitProps> =
  | StateFlexBinding<Value, Kind, Binding, Props>
  | StateFlatBinding<Value, Kind, Binding, Props>;

export type VariableBindingProps<Kind extends BindingType, Props extends InitProps> = Kind extends NumberBinding
  ? VariableBinding<number | undefined, Kind, Props>
  : Kind extends BooleanBinding
    ? VariableBinding<boolean | undefined, Kind, Props>
    : Kind extends 'date'
      ? VariableBinding<Date | undefined, Kind, Props>
      : Kind extends 'file'
        ? VariableBinding<FileList | undefined, Kind, Props>
        : VariableBinding<string | undefined, Kind, Props>;

export type StateBindingProps<
  Kind extends BindingType,
  Binding extends Bindable,
  Props extends InitProps,
> = Kind extends NumberBinding
  ? StateBinding<number | undefined, Kind, Binding, Props>
  : Kind extends BooleanBinding
    ? StateBinding<boolean | undefined, Kind, Binding, Props>
    : Kind extends 'date'
      ? StateBinding<Date | undefined, Kind, Binding, Props>
      : Kind extends 'file'
        ? StateBinding<FileList | undefined, Kind, Binding, Props>
        : StateBinding<string | undefined, Kind, Binding, Props>;

export type InputBindingProps<
  Kind extends BindingType,
  Binding extends Bindable,
  Props extends InitProps,
> = VariableBindingProps<Kind, Props> & StateBindingProps<Kind, Binding, Props>;

export interface InputBinding<Props extends InitProps> {
  (props: Props): ReactNode;
  <Bind extends Bindable, Kind extends BindingType = 'text'>(props: StateBindingProps<Kind, Bind, Props>): ReactNode;
  <Kind extends BindingType = 'text'>(props: VariableBindingProps<Kind, Props>): ReactNode;
}
