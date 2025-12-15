import { irpc } from '@lib/index.js';

export type HelloFn = (name: string) => Promise<string>;

export const hello = irpc.declare<HelloFn>({
  name: 'hello',
});
