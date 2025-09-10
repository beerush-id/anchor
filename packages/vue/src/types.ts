import type { Ref } from 'vue';

export type StateRef<T> = {
  value: T;
};
export type ConstantRef<T> = Ref<T> & {
  get value(): T;
};
export type VariableRef<T, S = T> = Ref<T, S>;
