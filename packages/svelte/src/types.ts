export type StateRef<T> = {
  value: T;
};

export type ConstantRef<T> = {
  get value(): T;
  publish(): void;
  subscribe(fn: RefSubscriber<T>): void;
};
export type VariableRef<T> = ConstantRef<T> & {
  set(value: T): void;
  set value(value: T);
};
export type RefSubscriber<T> = (current: T) => void;
