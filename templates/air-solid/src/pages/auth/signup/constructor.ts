import { irpc } from '../../../lib/module.js';
import { users } from '../store.js';
import { signUp } from './function.js';

irpc.construct(signUp, async (credentials) => {
  if (users.has(credentials.email)) {
    throw new Error('User already exists');
  }
  users.set(credentials.email, credentials);
  return { success: true, email: credentials.email };
});
