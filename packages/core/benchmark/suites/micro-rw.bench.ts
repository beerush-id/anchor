// benchmarks/micro-rw.bench.ts

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

  benny.add('Plain Object', () => {
    const obj = createSimpleObject();
    return () => {
      const val = obj.a;
    };
  }),

  benny.add('Plain Object (Getter, No Logic)', () => {
    const reflect = createSimpleObject();
    const proxy = {
      get a() {
        return reflect.a;
      },
      get b() {
        return reflect.b;
      },
    };

    return () => {
      const val = proxy.a;
    };
  }),

  benny.add('Plain Proxy (No Logic)', () => {
    const proxy = new Proxy(createSimpleObject(), {});
    return () => {
      const val = proxy.a;
    };
  }),

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

// --- Write Performance Suite ---

benny.suite(
  '🔬 Micro-Benchmark: Single-Level Write',

  benny.add('Plain Object', () => {
    const obj = createSimpleObject();
    return () => {
      obj.a = 99;
    };
  }),

  benny.add('Plain Object (Setter, No Logic)', () => {
    const reflect = createSimpleObject();
    const proxy = {
      set a(val: number) {
        reflect.a = val;
      },
      set b(val: number) {
        reflect.b = val;
      },
    };
    return () => {
      proxy.a = 99;
    };
  }),

  benny.add('Plain Proxy (No Logic)', () => {
    const proxy = new Proxy(createSimpleObject(), {});
    return () => {
      proxy.a = 99;
    };
  }),

  benny.add('anchor()', () => {
    const state = anchor(createSimpleObject(), { recursive: false });
    return () => {
      state.a = 99;
    };
  }),

  benny.add('anchor() with Schema', () => {
    const state = anchor(createSimpleObject(), { schema: simpleSchema, recursive: false });
    return () => {
      state.a = 99;
    };
  }),

  benny.cycle(),
  benny.complete()
);
