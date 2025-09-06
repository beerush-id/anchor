import { z } from 'zod';
import benny from 'benny';
import { anchor, derive, type StateChange } from '../dist/index.js';

export { anchor, derive, benny, type StateChange };

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  likes: z.number().min(0),
});

export const testSchema = z.object({
  id: z.number(),
  user: z.object({
    name: z.string(),
    profile: z.object({
      bio: z.string(),
      followers: z.number(),
    }),
    isActive: z.boolean(),
  }),
  posts: z.array(postSchema),
});

export type TestData = z.infer<typeof testSchema>;

export const createTestData = (): TestData => ({
  id: 1,
  user: {
    name: 'John Doe',
    profile: {
      bio: 'A developer.',
      followers: 100,
    },
    isActive: true,
  },
  posts: [
    { id: 'p1', title: 'First Post', likes: 10 },
    { id: 'p2', title: 'Second Post', likes: 25 },
  ],
});

export const simpleProxy = (data: any, recurisve?: boolean) => {
  if (recurisve) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        data[key] = simpleProxy(value, recurisve);
      }
    }
  }

  return new Proxy(data, {
    get(target, key, receiver) {
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      return Reflect.set(target, key, value, receiver);
    },
    deleteProperty(target, key) {
      return Reflect.deleteProperty(target, key);
    },
  });
};
