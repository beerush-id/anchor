import { createContext, useContext } from 'react';
import type { TabState } from '@anchorlib/headless-kit/states';

export const TabContext = createContext<TabState | null>(null);

export function useTab() {
  return useContext(TabContext);
}
