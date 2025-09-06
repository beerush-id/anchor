import benny from 'benny';
import { anchor, createTestData, testSchema } from '../shared.js';

benny.suite(
  '⚓ Anchor Creation',

  benny.add('Baseline (structuredClone)', () => {
    structuredClone(createTestData());
  }),

  benny.add('anchor() - Default (Lazy, Shallow Copy)', () => {
    anchor(createTestData());
  }),

  benny.add('anchor() - Hot Start (Eager, Shallow Copy)', () => {
    anchor(createTestData(), { lazy: false });
  }),

  benny.add('anchor() - Cold Start (Lazy, No Copy)', () => {
    anchor(createTestData());
  }),

  benny.add('anchor() - Non-Recursive (Deep Copy)', () => {
    anchor(createTestData(), { recursive: false });
  }),

  benny.add('anchor() - With Schema', () => {
    anchor(createTestData(), { schema: testSchema });
  }),

  benny.add('anchor() - Hot Start + Schema', () => {
    anchor(createTestData(), { lazy: false, schema: testSchema });
  }),

  benny.cycle(),
  benny.complete()
);
