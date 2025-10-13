import { createContext, useContext } from 'react';
import { type RadioGroupState } from '@anchorlib/headless-kit/states';

export const RadioGroupContext = createContext<RadioGroupState | undefined>(undefined);

export function useRadioGroup(): RadioGroupState | undefined {
  return useContext(RadioGroupContext);
}
