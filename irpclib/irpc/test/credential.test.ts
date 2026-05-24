import { AsyncStore, getContext, setContext, withIsolation } from '@anchorlib/core';
import { describe, expect, it } from 'vitest';
import { createCredentials, credential, getCredentials } from '../src/credential.js';
import { IRPC_BASE_CONTEXT } from '../src/enum.js';

describe('Credentials', () => {
  describe('createCredentials', () => {
    it('creates an AsyncStore from seed entries', () => {
      const store = createCredentials([
        ['apiKey', 'pk_xxx'],
        ['projectId', 'abc'],
      ]);

      expect(store).toBeInstanceOf(AsyncStore);
      expect(store.get('apiKey')).toBe('pk_xxx');
      expect(store.get('projectId')).toBe('abc');
    });

    it('creates an empty AsyncStore from empty seeds', () => {
      const store = createCredentials([]);

      expect(store).toBeInstanceOf(AsyncStore);
      expect(store.size).toBe(0);
    });

    it('creates an AsyncStore from a Map', () => {
      const seeds = new Map<string, unknown>([['key', 'value']]);

      const store = createCredentials(seeds);
      expect(store.get('key')).toBe('value');
    });
  });

  describe('getCredentials', () => {
    it('returns the credentials store from async context', async () => {
      const creds = createCredentials([['token', 'abc']]);

      const result = await withIsolation(
        () => {
          setContext(IRPC_BASE_CONTEXT.CREDENTIALS, creds);
          return getCredentials();
        },
        true,
        new AsyncStore()
      );

      expect(result).toBe(creds);
    });

    it('returns undefined when no credentials are set', async () => {
      const result = await withIsolation(
        () => {
          return getCredentials();
        },
        true,
        new AsyncStore()
      );

      expect(result).toBeUndefined();
    });
  });

  describe('credential', () => {
    it('retrieves a specific credential by key', async () => {
      const creds = createCredentials([
        ['apiKey', 'pk_xxx'],
        ['secret', 's3cret'],
      ]);

      const result = await withIsolation(
        () => {
          setContext(IRPC_BASE_CONTEXT.CREDENTIALS, creds);
          return credential('apiKey');
        },
        true,
        new AsyncStore()
      );

      expect(result).toBe('pk_xxx');
    });

    it('returns undefined for a missing credential key', async () => {
      const creds = createCredentials([['apiKey', 'pk_xxx']]);

      const result = await withIsolation(
        () => {
          setContext(IRPC_BASE_CONTEXT.CREDENTIALS, creds);
          return credential('nonexistent');
        },
        true,
        new AsyncStore()
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when no credentials store exists', async () => {
      const result = await withIsolation(
        () => {
          return credential('anything');
        },
        true,
        new AsyncStore()
      );

      expect(result).toBeUndefined();
    });

    it('retrieves credentials with correct type', async () => {
      const creds = createCredentials([
        ['count', 42],
        ['active', true],
        ['config', { nested: 'value' }],
      ]);

      const result = await withIsolation(
        () => {
          setContext(IRPC_BASE_CONTEXT.CREDENTIALS, creds);

          return {
            count: credential<number>('count'),
            active: credential<boolean>('active'),
            config: credential<{ nested: string }>('config'),
          };
        },
        true,
        new AsyncStore()
      );

      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.config).toEqual({ nested: 'value' });
    });
  });
});
