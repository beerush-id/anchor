import { stream } from '@irpclib/irpc';
import { demoRpc } from './api.ts';
import { getUser, type User, watchPrice } from './function.ts';

const MOCK_USERS: Record<string, User> = {
  '1': {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    role: 'Lead Architect',
  },
  '2': {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    role: 'Core Contributor',
  },
};

demoRpc.construct(getUser, async (id: string) => {
  return (
    MOCK_USERS[id] || {
      id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'Developer',
    }
  );
});

const DEFAULT_PRICES: Record<string, number> = {
  AAPL: 185.5,
  GOOG: 175.2,
  NVDA: 142.8,
};

demoRpc.construct(watchPrice, (symbol: string) => {
  return stream((state, resolve) => {
    state.data = { symbol, price: DEFAULT_PRICES[symbol] || 100 };
    let ticks = 0;

    const interval = setInterval(() => {
      if (++ticks >= 25) {
        clearInterval(interval);
        return resolve();
      }

      if (state.data) {
        const change = (Math.random() * 2 - 1) * 0.5;
        state.data.price = Number((state.data.price + change).toFixed(2));
      }
    }, 500);

    return () => clearInterval(interval);
  });
});
