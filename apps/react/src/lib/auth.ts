import { anchor } from '@anchor/core';
import { z } from 'zod/v4';

export const authState = anchor.immutable({ name: '', email: '', password: '' });
export const authForm = anchor.writable(authState);
export const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type AuthFormData = z.infer<typeof schema>;
