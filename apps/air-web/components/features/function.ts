import { demoRpc } from '../../pages/(docs)/api.ts';

export type Metrics = { cpu: number };
export type Transactions = { count: number };
export type Alerts = { count: number };
export type Uptime = { percent: number };

export type GetMetricsFn = (version: number) => Promise<Metrics>;
export type GetTransactionsFn = (version: number) => Promise<Transactions>;
export type GetAlertsFn = (version: number) => Promise<Alerts>;
export type GetUptimeFn = (version: number) => Promise<Uptime>;

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
