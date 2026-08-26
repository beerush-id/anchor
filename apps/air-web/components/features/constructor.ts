import { demoRpc } from '../../pages/(docs)/api.ts';
import { getAlerts, getMetrics, getTransactions, getUptime } from './function.ts';

// Each handler resolves after its own random delay, so the widgets fill in at
// different speeds even though their calls share one batched request.
const latency = () => new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 2000));

demoRpc.construct(getMetrics, async (version: number) => {
  await latency();
  return { cpu: Math.min(96, 32 + Math.floor(Math.random() * 40) + (version % 5) * 4) };
});

demoRpc.construct(getTransactions, async (version: number) => {
  await latency();
  return { count: 1180 + version * 9 + Math.floor(Math.random() * 80) };
});

demoRpc.construct(getAlerts, async (version: number) => {
  await latency();
  return { count: (version * 2 + Math.floor(Math.random() * 5)) % 7 };
});

demoRpc.construct(getUptime, async () => {
  await latency();
  return { percent: Number((99.9 + Math.random() * 0.09).toFixed(2)) };
});
