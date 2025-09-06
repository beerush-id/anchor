import benny from 'benny';
import { z } from 'zod';
import { anchor } from '../shared.js';

const createSimpleObject = () => ({ a: 1, b: 2, c: 3 });

const simpleSchema = z.object({
  a: z.number(),
  b: z.number(),
  c: z.number(),
});

// --- Read Performance Suite ---

benny.suite(
  '🔬 Micro-Benchmark: Single-Level Read',

  benny.add('anchor()', () => {
    const state = anchor(createSimpleObject(), { recursive: false });
    return () => {
      const val = state.a;
    };
  }),

  benny.add('anchor() (Recursive)', () => {
    const state = anchor({
      count: 1,
      user: {
        name: 'John',
        address: {
          line: '123 Street',
        },
      },
    });
    return () => {
      const val = state.user.address.line;
    };
  }),

  benny.add('anchor() (Recursive, Eager)', () => {
    const state = anchor(
      {
        count: 1,
        user: {
          name: 'John',
          address: {
            line: '123 Street',
          },
        },
      },
      { deferred: false }
    );
    return () => {
      const val = state.user.address.line;
    };
  }),

  benny.add('anchor() with Schema', () => {
    const state = anchor(createSimpleObject(), { schema: simpleSchema, recursive: false });
    return () => {
      const val = state.a;
    };
  }),

  benny.cycle(),
  benny.complete()
);
