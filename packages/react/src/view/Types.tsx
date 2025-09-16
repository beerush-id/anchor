import type { ReactNode, RefObject } from 'react';
import type { Bindable, VariableRef } from '@base/index.ts';
import type { WritableKeys } from '@anchorlib/core';

export type ViewRenderer<T> = (ref: RefObject<T | null>) => ReactNode;
export type ViewRendererFactory<T> = {
  name?: string;
  render: ViewRenderer<T>;
  onMounted?: () => void;
  onUpdated?: () => void;
  onDestroy?: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InitProps = { [key: string]: any };

export type TextBinding = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search' | 'color' | 'time';
export type NumberBinding = 'number' | 'range';
export type BooleanBinding = 'checkbox' | 'radio';
export type BindingType = TextBinding | NumberBinding | BooleanBinding | 'file' | 'date';

export type VariableBinding<Value, Kind extends BindingType, Props extends InitProps> = Props & {
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
> = Props & {
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
> = Props & {
  bind: Binding;
  bindKey: BindingKeys<Value, Binding>;
  type?: Kind;
  ref?: RefObject<unknown>;
};
export type StateBinding<Value, Kind extends BindingType, Binding extends Bindable, Props extends InitProps> =
  | StateFlexBinding<Value, Kind, Binding, Props>
  | StateFlatBinding<Value, Kind, Binding, Props>;

export type BindingProps<Value, Kind extends BindingType, Binding extends Bindable, Props extends InitProps> =
  Binding extends VariableRef<unknown>
    ? VariableBinding<Value, Kind, Props>
    : StateBinding<Value, Kind, Binding, Props>;

export type InputBindingProps<
  Kind extends BindingType,
  Binding extends Bindable,
  Props extends InitProps,
> = Kind extends NumberBinding
  ? BindingProps<number | undefined, Kind, Binding, Props>
  : Kind extends BooleanBinding
    ? BindingProps<boolean | undefined, Kind, Binding, Props>
    : Kind extends 'date'
      ? BindingProps<Date | undefined, Kind, Binding, Props>
      : Kind extends 'file'
        ? BindingProps<FileList | undefined, Kind, Binding, Props>
        : BindingProps<string | undefined, Kind, Binding, Props>;

export interface InputBinding<Props extends InitProps> {
  (props: Props): ReactNode;
  <Bind extends Bindable, Kind extends BindingType = 'text'>(props: InputBindingProps<Kind, Bind, Props>): ReactNode;
}
