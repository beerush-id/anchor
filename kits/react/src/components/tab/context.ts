import type { TabState } from '@anchorkit/headless/states';
import { createContext, useContext } from 'react';

export const TabContext = createContext<TabState | null>(null);

export function useTab() {
  return useContext(TabContext);
}
