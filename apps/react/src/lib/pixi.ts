import { createContext } from 'react';

export type IPixiApp = {
  status: 'init' | 'ready' | 'error';
};

export const PixiContext = createContext<IPixiApp | null>(null);
