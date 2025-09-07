import { anchor } from '@anchor/core';
import { z } from 'zod/v4';

export const schema = z.object({
  name: z.string().min(3, 'Name must be 3 characters min'),
  email: z.email('Invalid email format.'),
});

export const profileState = anchor.immutable(
  {
    name: 'John Doe',
    email: 'john@domain.com',
  },
  schema
);
export const profileWriter = anchor.writable(profileState);
