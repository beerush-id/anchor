import benny from 'benny';
import { anchor, createTestData, simpleProxy, type TestData, testSchema } from '../shared.js';

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

  benny.add('Proxy (Top Level, No Logic)', () => {
    const data = simpleProxy(createTestData(), false);
    // The inner function is what's benchmarked
    return () => {
      // Access a deep property repeatedly
      const bio = data.user.profile.bio;
    };
  }),

  benny.add('Anchor (Top Level)', () => {
    const state: TestData = anchor(createTestData(), { recursive: false });
    return () => {
      // This triggers the 'get' trap to check if children need anchoring
      const bio = state.user.profile.bio;
    };
  }),

  benny.add('Anchor (Top Level, Schema)', () => {
    const state: TestData = anchor(createTestData(), { schema: testSchema, recursive: false });
    return () => {
      // This triggers the 'get' trap to check if children need anchoring
      const bio = state.user.profile.bio;
    };
  }),

  benny.add('Proxy (Recursive, No Logic)', () => {
    const data = simpleProxy(createTestData(), true);
    // The inner function is what's benchmarked
    return () => {
      // Access a deep property repeatedly
      const bio = data.user.profile.bio;
    };
  }),

  benny.add('Anchor (Recursive)', () => {
    const state: TestData = anchor(createTestData());
    return () => {
      // This triggers the 'get' trap to check if children need anchoring
      const bio = state.user.profile.bio;
    };
  }),

  benny.add('Anchor (Recursive, Schema)', () => {
    const state: TestData = anchor(createTestData(), { schema: testSchema });
    return () => {
      // This triggers the 'get' trap to check if children need anchoring
      const bio = state.user.profile.bio;
    };
  }),

  benny.cycle(),
  benny.complete()
);
