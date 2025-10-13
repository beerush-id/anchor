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

export type Action = () => ActionRef | void;
export type ActionRef = {
  update?: ActionUpdater;
  destroy?: ActionDestroyer;
};
export type ActionUpdater = () => void;
export type ActionDestroyer = () => void;
