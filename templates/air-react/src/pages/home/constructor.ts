import { getAbortSignal, stream } from '@irpclib/irpc';
import { irpc } from '../../lib/module.js';
import { watchPrice } from './function.js';

irpc.construct(watchPrice, (symbol) => {
  return stream(async (state, resolve) => {
    const signal = getAbortSignal();
    state.data = { symbol, price: symbol.length * 15 + 20 };

    let tick = 0;
    const interval = setInterval(() => {
      tick++;

      if (tick >= 100) {
        clearInterval(interval);
        resolve();
        return;
      }

      state.data.price = state.data.price + (Math.random() * 2 - 1);
    }, 100);

    signal.addEventListener('abort', () => {
      clearInterval(interval);
    });
  });
});
