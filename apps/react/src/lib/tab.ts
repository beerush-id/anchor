import { createContext } from 'react';
import type { TabState } from '@anchorlib/headless-kit/states';

export const TabContext = createContext<TabState | null>(null);
