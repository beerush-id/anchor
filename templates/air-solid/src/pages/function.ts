import type { RemoteState } from '@irpclib/irpc';
import { irpc } from '../api.ts';

export type Visitor = {
  id: string;
  message?: string;
  cursor: { x: number; y: number; down?: boolean; target?: string };
};

export type Join = (visitor: Visitor) => RemoteState<Record<string, Visitor>>;
export type Move = (visitor: Visitor) => Promise<void>;
export type Chat = (visitor: Visitor) => Promise<void>;

const join = irpc.declare<Join>('visitor.join', {
  seed: () => ({}),
  keepAlive: true,
});

const move = irpc.declare<Move>('visitor.move');
const chat = irpc.declare<Chat>('visitor.chat');

export const visitor = {
  join,
  move,
  chat,
};