import benny from 'benny';
import { anchor, createTestData, subscribe, type TestData } from '../shared.js';

benny.suite(
  '📈 Subscription Scaling (Write performance with N subscribers)',

  benny.add('Baseline (No subscribers)', () => {
    const state: TestData = anchor(createTestData());
    return () => {
      state.user.profile.followers++;
    };
  }),

  benny.add('Write with 1 subscriber', () => {
    const state: TestData = anchor(createTestData());
    subscribe(state, () => {});
    return () => {
      state.user.profile.followers++;
    };
  }),

  benny.add('Write with 10 subscribers', () => {
    const state: TestData = anchor(createTestData());
    for (let i = 0; i < 10; i++) {
      subscribe(state, () => {});
    }
    return () => {
      state.user.profile.followers++;
    };
  }),

  benny.add('Write with 100 subscribers', () => {
    const state: TestData = anchor(createTestData());
    for (let i = 0; i < 100; i++) {
      subscribe(state, () => {});
    }
    return () => {
      state.user.profile.followers++;
    };
  }),

  benny.cycle(),
  benny.complete()
);
