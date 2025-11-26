export type ClassRef = {
  [key: string]: boolean | undefined;
};
export type ClassName = string | ClassRef;
export type ClassList = (ClassName | ClassList | undefined)[];

export type StyleDeclaration = {
  [K in keyof CSSStyleDeclaration]?: string | number | undefined;
} & {
  [key: `--${string}`]: string | number | undefined;
};
export type StyleRef = StyleDeclaration;

export type Action<T> = (current?: T) => ActionRef<T>;
export type ActionRef<T> = {
  update: ActionUpdater<T>;
  destroy?: ActionDestroyer;
};
export type ActionUpdater<T> = (current?: T) => undefined;
export type ActionDestroyer = () => void;
export type ActionRefObj<T> = {
  get current(): T | null;
  set current(value: T | null);
  destroy(): void;
};
