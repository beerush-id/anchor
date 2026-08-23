import { inherit } from '@airlib/core';

export const DEFAULT_ROUTER_CONFIGS = inherit<{
  scrollBehavior: ScrollBehavior;
}>(undefined, undefined, {
  scrollBehavior: 'auto',
});
