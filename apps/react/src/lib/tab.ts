import { createContext } from 'react';
import type { TabState } from '@anchorkit/headless/states';

export const TabContext = createContext<TabState | null>(null);
