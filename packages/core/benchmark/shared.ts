import { z } from 'zod';
import benny from 'benny';
import { anchor, derive, type StateChangeEvent } from '../dist/index.js';

export { anchor, derive, benny, type StateChangeEvent };

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
