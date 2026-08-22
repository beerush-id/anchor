import { anchor, mutable, safeRun } from '@airlib/react/core';
import { stream } from '@irpclib/irpc';
import { irpc } from '@/src/api.ts';
import { type Visitor, visitor } from './function.ts';

const VISITOR_MAP = safeRun(() => mutable({} as Record<string, Visitor>));
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

irpc.construct(visitor.move, (visitor: Visitor) => {
  const current = VISITOR_MAP[visitor.id];
  if (!current) return;
  anchor.assign(current.cursor, visitor.cursor);
});

irpc.construct(visitor.chat, (v: Visitor) => {
  const current = VISITOR_MAP[v.id];
  if (!current) return;

  current.message = v.message;

  const existing = timeouts.get(v.id);
  if (existing) clearTimeout(existing);

  timeouts.set(
    v.id,
    setTimeout(() => {
      current.message = '';
    }, 5000)
  );
});

irpc.construct(visitor.join, (user) =>
  stream((state) => {
    join(user);

    state.data = VISITOR_MAP;

    return () => {
      leave(user.id);
    };
  })
);

const join = (visitor: Visitor) => {
  if (!VISITOR_MAP[visitor.id]) VISITOR_MAP[visitor.id] = visitor;
  console.log('Join:', visitor.id);
};

const leave = (id: string) => {
  if (VISITOR_MAP[id]) delete VISITOR_MAP[id];
  console.log('Left:', id);
};
