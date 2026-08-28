import { anchor } from '@airlib/react';
import { stream } from '@irpclib/irpc';
import { demoRpc } from '../../pages/(docs)/api.js';
import type { StockItem } from '../StockTable.js';
import { getAlerts, getMetrics, getStocks, getTransactions, getUptime, INITIAL_STOCKS } from './function.js';

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

demoRpc.construct(getStocks, () => {
  return stream<StockItem[]>((state, resolve) => {
    state.data = structuredClone(INITIAL_STOCKS);

    const timer = setInterval(() => {
      if (state.status === 'aborted' || state.status === 'error') {
        clearInterval(timer);
        return;
      }

      const list = state.data;
      const idx = Math.floor(Math.random() * list.length);
      const stock = list[idx];
      if (!stock) return;

      const delta = (Math.random() - 0.48) * (stock.price * 0.008);
      const newPrice = Math.max(1, stock.price + delta);
      const newChange = stock.change + delta;

      anchor.assign(stock, {
        price: newPrice,
        change: newChange,
        changePercent: (newChange / (newPrice - newChange)) * 100,
        high24h: Math.max(stock.high24h, newPrice),
        low24h: Math.min(stock.low24h, newPrice),
      });

      stock.history.push(newPrice);
      if (stock.history.length > 18) stock.history.shift();
    }, 250);

    const autoClose = setTimeout(() => {
      clearInterval(timer);
      resolve();
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(autoClose);
    };
  });
});
