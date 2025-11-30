import { getContext, setContext } from '@anchorlib/core';
import { useVariable, type VariableRef } from '@anchorlib/react-classic';

export const CtaHoverCount = Symbol('cta:hover-count');
export const useCtaHoverCount = () => {
  const [count] = useVariable(0);
  setContext(CtaHoverCount, count);

  return count;
};
export const getCtaHoverCount = () => {
  return getContext<VariableRef<number>>(CtaHoverCount);
};
