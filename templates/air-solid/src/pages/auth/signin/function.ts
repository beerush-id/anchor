import { irpc } from '../../../lib/module.js';

export type SignInFn = (credentials: {
  email: string;
  password: string;
}) => Promise<{ success: boolean; email: string }>;
export const signIn = irpc.declare<SignInFn>({ name: 'auth.signin' });
