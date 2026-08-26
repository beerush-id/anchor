import type { RemoteState } from '@irpclib/irpc';
import { demoRpc } from '../../pages/(docs)/api.ts';
import type { StockItem } from '../StockTable.js';

export type Metrics = { cpu: number };
export type Transactions = { count: number };
export type Alerts = { count: number };
export type Uptime = { percent: number };

export type GetMetricsFn = (version: number) => Promise<Metrics>;
export type GetTransactionsFn = (version: number) => Promise<Transactions>;
export type GetAlertsFn = (version: number) => Promise<Alerts>;
export type GetUptimeFn = (version: number) => Promise<Uptime>;
export type GetStocksFn = () => RemoteState<StockItem[]>;

export const INITIAL_STOCKS: StockItem[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 138.25,
    change: 4.82,
    changePercent: 3.61,
    volume: '$48.2B',
    marketCap: '$3.39T',
    high24h: 140.1,
    low24h: 134.5,
    history: [134.5, 135.2, 134.8, 136.1, 135.9, 137.4, 136.8, 138.25],
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 228.4,
    change: 1.65,
    changePercent: 0.73,
    volume: '$29.4B',
    marketCap: '$3.47T',
    high24h: 229.8,
    low24h: 226.9,
    history: [227.1, 226.9, 227.8, 228.1, 227.6, 228.0, 228.4],
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 164.3,
    change: -1.2,
    changePercent: -0.72,
    volume: '$18.1B',
    marketCap: '$2.04T',
    high24h: 166.5,
    low24h: 163.8,
    history: [166.2, 165.8, 166.5, 165.1, 164.7, 165.0, 164.3],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 219.75,
    change: 6.45,
    changePercent: 3.02,
    volume: '$24.6B',
    marketCap: '$702.4B',
    high24h: 221.3,
    low24h: 212.8,
    history: [213.2, 212.8, 215.0, 216.4, 217.9, 218.2, 219.75],
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 64250.0,
    change: 1420.0,
    changePercent: 2.26,
    volume: '$38.9B',
    marketCap: '$1.26T',
    high24h: 64800.0,
    low24h: 62500.0,
    history: [62700, 62500, 63100, 63400, 63900, 63700, 64250],
  },
];

export const getMetrics = demoRpc.declare<GetMetricsFn>('getMetrics', {
  seed: () => ({ cpu: 0 }),
});
export const getTransactions = demoRpc.declare<GetTransactionsFn>('getTransactions', {
  seed: () => ({ count: 0 }),
});
export const getAlerts = demoRpc.declare<GetAlertsFn>('getAlerts', {
  seed: () => ({ count: 0 }),
});
export const getUptime = demoRpc.declare<GetUptimeFn>('getUptime', {
  seed: () => ({ percent: 0 }),
});
export const getStocks = demoRpc.declare<GetStocksFn>('getStocks', {
  seed: () => INITIAL_STOCKS,
  keepAlive: true,
});
