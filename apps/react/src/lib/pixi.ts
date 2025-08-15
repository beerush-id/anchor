import { createContext } from 'react';
import type { Application } from 'pixi.js';

export type IPixiApp = {
  status: 'init' | 'ready' | 'error';
  instance: Application;
};

export const PixiContext = createContext<IPixiApp | null>(null);
