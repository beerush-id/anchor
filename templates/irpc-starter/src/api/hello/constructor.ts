import { irpc } from '@/lib/module.js';
import { sayHello } from './index.js';

irpc.construct(sayHello, async (name) => {
  return `Hello, ${name}! Welcome to the IRPC Isomorphic API.`;
});
