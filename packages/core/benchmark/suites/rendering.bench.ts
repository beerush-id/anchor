import benny from 'benny';
import { anchor } from '../shared.js';
import { linkable } from '../../src/internal.js';
import type { ObjLike } from '@anchorlib/core';
import type { KeyLike } from '../../src/index.js'; // Assuming shared.ts exists

// --- More complex data for the UI scenario ---

type UserProfile = {
  bio: string;
  avatar: string;
};

type UserAccount = {
  email: string;
  lastLogin: Date;
  twoFactorEnabled: boolean;
};

type UserAddress = {
  street: string;
  city: string;
  zipCode: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profile: UserProfile;
  account: UserAccount;
  address: UserAddress;
};

const ITEM_COUNT = 1000;

const createUsers = (count = ITEM_COUNT): User[] => {
  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = `User`;
    const lastName = `${i}`;

    users.push({
      id: `user_${i}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      profile: {
        bio: `This is the bio for user ${i}.`,
        avatar: `https://example.com/avatar/${i}.png`,
      },
      account: {
        email: `user${i}@example.com`,
        lastLogin: new Date(),
        twoFactorEnabled: i % 2 === 0,
      },
      address: {
        street: `${i} Main St`,
        city: 'Anytown',
        zipCode: '12345',
      },
    });
  }

  return users;
};

const flatProxyHandler = {
  get(target: ObjLike, key: KeyLike, receiver?: unknown) {
    const value = Reflect.get(target, key, receiver);

    if (linkable(value)) {
      return new Proxy(value, flatProxyHandler);
    }

    return value;
  },
};
// --- The Benchmark Suite ---

benny.suite(
  `🖥️ UI Rendering Simulation (${ITEM_COUNT} items)`,

  // This benchmark measures the combined cost of creation + a full read loop.
  // It's a more holistic measure of "time to first paint".

  benny.add('Baseline (Plain Array)', () => {
    const users = createUsers();
    let output = '';
    // Simulate reading the values as a UI would
    for (const user of users) {
      output += user.id;
      output += user.fullName;
      output += user.account.email;
    }
    // Returning the string prevents the loop from being optimized away
    return output;
  }),

  benny.add('Baseline (Plain Proxy)', () => {
    const users = new Proxy(createUsers(), flatProxyHandler as never);
    let output = '';
    // Simulate reading the values as a UI would
    for (const user of users) {
      output += user.id;
      output += user.fullName;
      output += user.account.email;
    }
    // Returning the string prevents the loop from being optimized away
    return output;
  }),

  benny.add('anchor() - Default (Lazy)', () => {
    const state: User[] = anchor(createUsers(), { immutable: true });
    let output = '';
    for (const user of state) {
      output += user.id;
      output += user.fullName;
      // This will trigger lazy proxy creation for `user.account`
      output += user.account.email;
    }
    return output;
  }),

  benny.cycle(),
  benny.complete()
);
