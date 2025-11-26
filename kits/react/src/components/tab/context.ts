import { createContext, useContext } from 'react';
import type { TabState } from '@anchorkit/headless/states';

export const TabContext = createContext<TabState | null>(null);

export function useTab() {
  return useContext(TabContext);
}
