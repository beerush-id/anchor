import type { ClassList, ClassName } from '@anchorkit/headless/utils';

export type ReactProps<T> = Omit<T, 'className'> & {
  className?: ClassName | ClassList;
};
