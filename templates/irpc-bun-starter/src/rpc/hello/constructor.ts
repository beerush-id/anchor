import { irpc } from '@lib';
import { hello } from './index.js';

irpc.construct(hello, async (name) => {
  if (!name) {
    throw new Error('Name is required');
  }

  return `Hello ${name}`;
});
