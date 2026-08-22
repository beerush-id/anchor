import { irpc } from '@/lib/module.js';

export type SayHelloFn = (name: string) => Promise<string>;

export const sayHello = irpc.declare<SayHelloFn>('sayHello', {
  seed: () => '',
});
