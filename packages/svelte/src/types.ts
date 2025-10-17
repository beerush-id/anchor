export type StateRef<T> = {
  value: T;
};

export type ConstantRef<T> = {
  get value(): T;
};
export type VariableRef<T> = ConstantRef<T> & {
  set value(value: T);
};
