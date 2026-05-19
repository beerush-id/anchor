import { irpc } from '../../../lib/module.js';

export type SignUpFn = (credentials: {
  email: string;
  password: string;
}) => Promise<{ success: boolean; email: string }>;
export const signUp = irpc.declare<SignUpFn>({ name: 'signUp' });
