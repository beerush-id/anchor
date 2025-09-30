export type StateRef<T> = {
  value: T;
};

export type ConstantRef<T> = {
  get value(): T;
};

export type VariableRef<T> = {
  get value(): T;
  set value(value: T);
};
