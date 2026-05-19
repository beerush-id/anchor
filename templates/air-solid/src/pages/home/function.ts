import type { RemoteState } from '@irpclib/irpc';
import { irpc } from '../../lib/module.js';

export type WatchPriceFn = (symbol: string) => RemoteState<{ symbol: string; price: number }>;
export const watchPrice = irpc.declare<WatchPriceFn>({
  name: 'watchPrice',
  stream: true,
  init: () => ({ symbol: '', price: 0 }),
});
