import { createContext, useContext, useRef } from 'react';
import {
  type CollapsibleGroupInit,
  type CollapsibleGroupState,
  type CollapsibleInit,
  type CollapsibleState,
  createCollapsible,
  createCollapsibleGroup,
} from '@anchorkit/headless/states';

export const AccordionGroupContext = createContext<CollapsibleGroupState | null>(null);
export const AccordionContext = createContext<CollapsibleState | null>(null);

export const useAccordionGroup = () => {
  return useContext(AccordionGroupContext);
};

export const useAccordion = () => {
  return useContext(AccordionContext);
};

export function useAccordionGroupState(init?: CollapsibleGroupInit) {
  return useRef(createCollapsibleGroup(init)).current;
}

export function useAccordionState(init: CollapsibleInit) {
  return useRef(createCollapsible(init)).current;
}
