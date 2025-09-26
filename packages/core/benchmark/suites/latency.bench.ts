import benny from 'benny';
import { anchor, createTestData, type StateChange, subscribe, type TestData } from '../shared.js';

benny.suite(
  '⚡ Subscription Latency (Time from change to notification)',

  benny.add('Notify on nested property write', async () => {
    const state: TestData = anchor(createTestData());
    await new Promise<void>((resolve) => {
      const unsubscribe = subscribe(state, (_, event?: StateChange) => {
        if (event?.type === 'set' && event.keys.join('.') === 'user.profile.bio') {
          unsubscribe();
          resolve();
        }
      });
      state.user.profile.bio = 'A new bio from the test.';
    });
  }),

  benny.add('Notify on array mutation (push)', async () => {
    const state: TestData = anchor(createTestData());
    await new Promise<void>((resolve) => {
      const unsubscribe = subscribe(state, (_, event?: StateChange) => {
        if (event?.type === 'push') {
          unsubscribe();
          resolve();
        }
      });
      state.posts.push({ id: 'p3', title: 'A new post', likes: 0 });
    });
  }),

  benny.cycle(),
  benny.complete()
);
