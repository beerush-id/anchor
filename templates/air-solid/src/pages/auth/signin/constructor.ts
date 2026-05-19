import { irpc } from '../../../lib/module.js';
import { users } from '../store.js';
import { signIn } from './function.js';

irpc.construct(signIn, async (credentials) => {
  const user = users.get(credentials.email);

  if (!user || user.password !== credentials.password) {
    throw new Error('Invalid email or password');
  }

  return { success: true, email: credentials.email };
});
