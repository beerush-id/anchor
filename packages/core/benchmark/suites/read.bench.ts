import benny from 'benny';
import { anchor, createTestData, type TestData } from '../shared.js';

benny.suite(
  '📖 Property Read Performance',

  benny.add('Baseline (Plain Object)', () => {
    const data = createTestData();
    // The inner function is what's benchmarked
    return () => {
      // Access a deep property repeatedly
      const bio = data.user.profile.bio;
    };
  }),

  benny.add('anchor() - Default (Lazy, Shallow Copy)', () => {
    const state: TestData = anchor(createTestData());
    return () => {
      // This triggers the 'get' trap to check if children need anchoring
      const bio = state.user.profile.bio;
    };
  }),

  benny.add('anchor() - Hot Start (Eager, Shallow Copy)', () => {
    const state: TestData = anchor(createTestData(), { lazy: false });
    return () => {
      // All proxies are created upfront, so this is just a 'get' trap
      const bio = state.user.profile.bio;
    };
  }),

  benny.add('anchor() - Cold Start (Eager, No Copy)', () => {
    const state: TestData = anchor(createTestData(), { lazy: false, copy: false });
    return () => {
      // All proxies are created upfront, so this is just a 'get' trap
      const bio = state.user.profile.bio;
    };
  }),

  benny.add('anchor() - Non-Recursive', () => {
    const state: TestData = anchor(createTestData(), { recursive: false });
    return () => {
      // In this case, `state.user.profile` is a plain object.
      // This should be nearly as fast as the baseline.
      const bio = state.user.profile.bio;
    };
  }),

  benny.cycle(),
  benny.complete()
);
