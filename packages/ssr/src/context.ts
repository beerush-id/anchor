import { $symbol, getContext } from '@anchorlib/core';

export const SSR_ENV_KEY = $symbol('ssr-env');

export function ssrEnv<E>() {
  return getContext<E>(SSR_ENV_KEY);
}
