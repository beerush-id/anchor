import type { RemoteState } from '@irpclib/irpc';
import { demoRpc } from './api.ts';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Stock = {
  symbol: string;
  price: number;
};

export type GetUserFn = (id: string) => Promise<User | void>;
export type WatchPriceFn = (symbol: string) => RemoteState<Stock>;

export const getUser = demoRpc.declare<GetUserFn>('getUser', {
  seed: () => {},
});

export const watchPrice = demoRpc.declare<WatchPriceFn>('watchPrice', {
  seed: () => ({ symbol: '', price: 100 }),
});
