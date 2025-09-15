import type { ReactNode, RefObject } from 'react';

export type ViewRenderer<T, E> = (ref: RefObject<T | null>, debugRef: RefObject<E | null>) => ReactNode;
export type ViewRendererFactory<T, E> = {
  name?: string;
  render: ViewRenderer<T, E>;
  onMounted?: () => void;
  onUpdated?: () => void;
  onDestroy?: () => void;
};
