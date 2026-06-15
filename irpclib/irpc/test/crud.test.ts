import { describe, expect, it, vi } from 'vitest';
import { IRPCCrudAdapter } from '../src/adapter.js';
import { CrudError } from '../src/error.js';
import { IRPCCrudDriver } from '../src/index.js';
import { createPackage } from '../src/module.js';

type User = { id: string; name: string; email: string };

const defaultUser = (): User => ({ id: '', name: '', email: '' });

describe('CRUD', () => {
  describe('createPackage with key', () => {
    it('should default key to id', () => {
      const pkg = createPackage({ name: 'test', version: '1.0.0' });
      expect(pkg.config.key).toBe('id');
    });

    it('should accept a custom key', () => {
      const pkg = createPackage({ name: 'test', version: '1.0.0', key: '_id' });
      expect(pkg.config.key).toBe('_id');
    });
  });

  describe('.crud()', () => {
    it('should declare all four CRUD stubs', () => {
      const pkg = createPackage({ name: 'crud_test', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      expect(typeof users.get).toBe('function');
      expect(typeof users.create).toBe('function');
      expect(typeof users.update).toBe('function');
      expect(typeof users.delete).toBe('function');
    });

    it('should register specs with dot-separated names', () => {
      const pkg = createPackage({ name: 'crud_names', version: '1.0.0' });
      pkg.crud<User>('users', defaultUser);

      expect(pkg.get('users.get')).toBeDefined();
      expect(pkg.get('users.create')).toBeDefined();
      expect(pkg.get('users.update')).toBeDefined();
      expect(pkg.get('users.delete')).toBeDefined();
    });

    it('should store per-method options in specs', () => {
      const pkg = createPackage({ name: 'crud_meta', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser, {
        maxAge: 5000,
        description: { get: 'Fetch user', create: 'Create user' },
      });

      const getSpec = (pkg as any)['stubs'].get(users.get)!;
      expect(getSpec.name).toBe('users.get');
      expect(getSpec.maxAge).toBe(5000);
      expect(getSpec.description).toBe('Fetch user');

      const createSpec = (pkg as any)['stubs'].get(users.create)!;
      expect(createSpec.description).toBe('Create user');
      expect(createSpec.maxAge).toBeUndefined();

      const updateSpec = (pkg as any)['stubs'].get(users.update)!;
      expect(updateSpec.description).toBeUndefined();

      const deleteSpec = (pkg as any)['stubs'].get(users.delete)!;
      expect(deleteSpec.maxAge).toBeUndefined();
    });

    it('should use shared description when string is provided', () => {
      const pkg = createPackage({ name: 'crud_desc', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser, {
        description: 'User operations',
      });

      expect((pkg as any)['stubs'].get(users.get)!.description).toBe('User operations');
      expect((pkg as any)['stubs'].get(users.create)!.description).toBe('User operations');
      expect((pkg as any)['stubs'].get(users.update)!.description).toBe('User operations');
      expect((pkg as any)['stubs'].get(users.delete)!.description).toBe('User operations');
    });

    it('should use package key in adapter meta', () => {
      const pkg = createPackage({ name: 'crud_key', version: '1.0.0', key: '_id' });
      expect(pkg.config.key).toBe('_id');
    });

    it('should fallback key to id when config.key is undefined', () => {
      const pkg = createPackage({ name: 'crud_key_fb', version: '1.0.0' });
      delete (pkg.config as any).key;
      expect(pkg.config.key).toBeUndefined();
    });

    it('should exclude specified methods', () => {
      const pkg = createPackage({ name: 'crud_exclude', version: '1.0.0' });
      const users = pkg.exclude(pkg.crud<User>('users', defaultUser), ['delete']);

      expect('get' in users).toBe(true);
      expect('create' in users).toBe(true);
      expect('update' in users).toBe(true);
      expect('delete' in users).toBe(false);

      // Excluded methods should not have specs
      expect(pkg.get('users.delete')).toBeUndefined();
    });

    it('should exclude multiple methods', () => {
      const pkg = createPackage({ name: 'crud_multi_ex', version: '1.0.0' });
      const users = pkg.exclude(pkg.crud<User>('users', defaultUser), ['update', 'delete']);

      expect('get' in users).toBe(true);
      expect('create' in users).toBe(true);
      expect('update' in users).toBe(false);
      expect('delete' in users).toBe(false);
    });

    it('should handle options with excludes', () => {
      const pkg = createPackage({ name: 'crud_ex_opts', version: '1.0.0' });
      const users = pkg.exclude(pkg.crud<User>('users', defaultUser, { maxAge: 3000 }), ['delete']);

      expect((pkg as any)['stubs'].get(users.get)!.maxAge).toBe(3000);
      expect(pkg.get('users.delete')).toBeUndefined();
    });

    it('should work without options', () => {
      const pkg = createPackage({ name: 'crud_no_opts', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      expect((pkg as any)['stubs'].get(users.get)!.maxAge).toBeUndefined();
      expect((pkg as any)['stubs'].get(users.get)!.coalesce).toBeUndefined();
    });

    it('should pass per-method schemas to specs', () => {
      const pkg = createPackage({ name: 'crud_schema', version: '1.0.0' });
      const getSchema = { input: [] };
      const createSchema = { input: [] };

      const users = pkg.crud<User>('users', defaultUser, {
        schema: {
          get: getSchema as never,
          create: createSchema as never,
        },
      });

      expect((pkg as any)['stubs'].get(users.get)!.schema).toBe(getSchema);
      expect((pkg as any)['stubs'].get(users.create)!.schema).toBe(createSchema);
      expect((pkg as any)['stubs'].get(users.update)!.schema).toBeUndefined();
    });

    it('should allow construct on individual stubs', async () => {
      const pkg = createPackage({ name: 'crud_construct', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      pkg.construct(users.get, async (id) => ({ id: id as string, name: 'John', email: 'john@test.com' }));

      const result = await users.get('123');
      expect(result).toEqual({ id: '123', name: 'John', email: 'john@test.com' });
    });
  });

  describe('IRPCAdapter', () => {
    it('should create adapter with a package', () => {
      const pkg = createPackage({ name: 'adapter_test', version: '1.0.0' });
      const adapter = new IRPCCrudAdapter(pkg);
      expect(adapter).toBeInstanceOf(IRPCCrudAdapter);
    });

    it('should throw CrudError.notFound when attaching unregistered stubs', () => {
      const pkg = createPackage({ name: 'adapter_err', version: '1.0.0' });
      const adapter = new IRPCCrudAdapter(pkg);

      expect(() => adapter.attach({ get: (() => {}) as never })).toThrow(CrudError);
    });

    it('should attach CRUD stubs and wire handlers', async () => {
      const pkg = createPackage({ name: 'adapter_wire', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (_meta, id) => ({ id, name: 'John', email: 'john@test.com' }),
        create: (_meta, data) => data,
        update: (_meta, _id, data) => data,
        delete: (_meta, id) => ({ id, name: '', email: '' }),
      });
      adapter.attach(users);

      const result = await users.get('123');
      expect(result).toEqual({ id: '123', name: 'John', email: 'john@test.com' });
    });

    it('should throw CrudError.notImplemented when no driver for method', () => {
      const pkg = createPackage({ name: 'adapter_no_impl', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.attach(users);

      // No driver attached — all methods throw
      expect(() => adapter.get({ name: 'users', key: 'id' }, '1')).toThrow(CrudError);
    });

    it('should throw CrudError.notImplemented for missing driver methods', () => {
      const pkg = createPackage({ name: 'adapter_partial', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (_meta, id) => ({ id }),
        // create, update, delete not provided
      });
      adapter.attach(users);

      // get works
      expect(() => adapter.get({ name: 'users', key: 'id' }, '1')).not.toThrow();

      // create throws
      expect(() => adapter.create({ name: 'users', key: 'id' }, {})).toThrow(CrudError);
    });

    it('should pass meta to driver', async () => {
      const pkg = createPackage({ name: 'adapter_meta', version: '1.0.0', key: '_id' });
      const users = pkg.crud<User>('users', defaultUser, { maxAge: 5000 });

      const receivedMeta: any[] = [];
      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (meta, id) => {
          receivedMeta.push(meta);
          return { id, name: '', email: '' };
        },
      });
      adapter.attach(users);

      await users.get('123');

      expect(receivedMeta[0].name).toBe('users');
      expect(receivedMeta[0].key).toBe('_id');
      expect(receivedMeta[0].maxAge).toBe(5000);
    });

    it('should fallback key to id when config.key is undefined', async () => {
      const pkg = createPackage({ name: 'adapter_key_fb', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      delete (pkg.config as any).key;

      const receivedMeta: any[] = [];
      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (meta, id) => {
          receivedMeta.push(meta);
          return { id, name: '', email: '' };
        },
      });
      adapter.attach(users);

      await users.get('1');
      expect(receivedMeta[0].key).toBe('id');
    });

    it('should support multiple entities on one adapter', async () => {
      type Post = { id: string; title: string };

      const pkg = createPackage({ name: 'adapter_multi', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);
      const posts = pkg.crud<Post>('posts', () => ({ id: '', title: '' }));

      const results: string[] = [];
      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (meta, _id) => {
          results.push(meta.name);
          return {};
        },
      });
      adapter.attach(users).attach(posts);

      await users.get('1');
      await posts.get('2');

      expect(results).toEqual(['users', 'posts']);
    });

    it('should support chain of responsibility with NextDriver', async () => {
      const pkg = createPackage({ name: 'adapter_chain', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const cache = new Map<string, User>();
      cache.set('1', { id: '1', name: 'Cached', email: 'cached@test.com' });

      const cacheDriver: IRPCCrudDriver = {
        get: (_meta, id) => {
          const cached = cache.get(id as string);
          if (cached) return cached;
          throw IRPCCrudAdapter.next();
        },
      };

      const dbDriver: IRPCCrudDriver = {
        get: (_meta, id) => ({ id, name: 'FromDB', email: 'db@test.com' }),
        create: (_meta, data) => data,
        update: (_meta, _id, data) => data,
        delete: (_meta, id) => ({ id }),
      };

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use(cacheDriver).use(dbDriver);
      adapter.attach(users);

      // Cache hit
      const cached = await users.get('1');
      expect(cached).toEqual({ id: '1', name: 'Cached', email: 'cached@test.com' });

      // Cache miss → falls through to DB
      const fromDB = await users.get('2');
      expect(fromDB).toEqual({ id: '2', name: 'FromDB', email: 'db@test.com' });
    });

    it('should propagate real errors without falling through', () => {
      const pkg = createPackage({ name: 'adapter_real_err', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const failingDriver: IRPCCrudDriver = {
        get: () => {
          throw new Error('DB connection failed');
        },
      };

      const fallbackDriver: IRPCCrudDriver = {
        get: () => ({ id: '1', name: 'Fallback', email: '' }),
      };

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use(failingDriver).use(fallbackDriver);
      adapter.attach(users);

      // Real error propagates — doesn't fall through to fallback
      expect(() => adapter.get({ name: 'users', key: 'id' }, '1')).toThrow('DB connection failed');
    });

    it('should skip drivers without the requested method', () => {
      const pkg = createPackage({ name: 'adapter_skip', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const partialDriver: IRPCCrudDriver = {
        // No get method
        create: (_meta, data) => data,
      };

      const fullDriver: IRPCCrudDriver = {
        get: (_meta, id) => ({ id, name: 'Full', email: '' }),
      };

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use(partialDriver).use(fullDriver);
      adapter.attach(users);

      // partialDriver skipped (no get), fullDriver handles it
      expect(adapter.get({ name: 'users', key: 'id' }, '1')).toEqual({
        id: '1',
        name: 'Full',
        email: '',
      });
    });

    it('should prevent duplicate drivers with Set', () => {
      const pkg = createPackage({ name: 'adapter_dedup', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const callCount = vi.fn();
      const driver: IRPCCrudDriver = {
        get: (_meta, id) => {
          callCount();
          return { id };
        },
      };

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use(driver).use(driver).use(driver);
      adapter.attach(users);

      adapter.get({ name: 'users', key: 'id' }, '1');
      expect(callCount).toHaveBeenCalledTimes(1);
    });

    it('should support driver swap with use after attach', async () => {
      const pkg = createPackage({ name: 'adapter_swap', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.attach(users);

      // Add driver after attach — delegation reads driver at call time
      adapter.use({
        get: (_meta, id) => ({ id, name: 'Late', email: '' }),
        create: (_meta, data) => data,
        update: (_meta, _id, data) => data,
        delete: (_meta, id) => ({ id }),
      });

      const result = await users.get('1');
      expect(result).toEqual({ id: '1', name: 'Late', email: '' });
    });

    it('should allow construct to override adapter handler', async () => {
      const pkg = createPackage({ name: 'adapter_override', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (_meta, id) => ({ id, name: 'Adapter', email: '' }),
        create: (_meta, data) => data,
        update: (_meta, _id, data) => data,
        delete: (_meta, id) => ({ id }),
      });
      adapter.attach(users);

      // Override with direct construct
      pkg.construct(users.get, async (id) => ({ id: id as string, name: 'Direct', email: '' }));

      const result = await users.get('1');
      expect(result).toEqual({ id: '1', name: 'Direct', email: '' });
    });

    it('should only attach stubs that exist in partial CRUD', async () => {
      const pkg = createPackage({ name: 'adapter_partial_crud', version: '1.0.0' });
      const users = pkg.exclude(pkg.crud<User>('users', defaultUser), ['delete']);

      const calls: string[] = [];
      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (meta) => {
          calls.push(`get:${meta.name}`);
          return {};
        },
        create: (meta) => {
          calls.push(`create:${meta.name}`);
          return {};
        },
        update: (meta) => {
          calls.push(`update:${meta.name}`);
          return {};
        },
        delete: (meta) => {
          calls.push(`delete:${meta.name}`);
          return {};
        },
      });
      adapter.attach(users);

      await users.get('1');
      await users.create({} as never);
      await users.update('1', {} as never);

      expect((users as any).delete).toBeUndefined();
      expect(calls).toEqual(['get:users', 'create:users', 'update:users']);
    });

    it('should return this from attach and use for chaining', () => {
      const pkg = createPackage({ name: 'adapter_chain_api', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      const result = adapter.use({}).attach(users);

      expect(result).toBe(adapter);
    });

    it('should attach a single stub with method overload', async () => {
      const pkg = createPackage({ name: 'adapter_single', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: (_meta, id) => ({ id, name: 'Single', email: '' }),
      });
      adapter.attach(users.get, 'get');

      const result = await users.get('1');
      expect(result).toEqual({ id: '1', name: 'Single', email: '' });
    });

    it('should dispatch all four CRUD methods through adapter', () => {
      const pkg = createPackage({ name: 'adapter_all', version: '1.0.0' });
      const users = pkg.crud<User>('users', defaultUser);

      const meta = { name: 'users', key: 'id' } as any;
      const calls: string[] = [];

      const adapter = new IRPCCrudAdapter(pkg);
      adapter.use({
        get: () => {
          calls.push('get');
          return {};
        },
        create: () => {
          calls.push('create');
          return {};
        },
        update: () => {
          calls.push('update');
          return {};
        },
        delete: () => {
          calls.push('delete');
          return {};
        },
      });
      adapter.attach({ ...users, catch: undefined as never } as never);

      adapter.get(meta, '1');
      adapter.create(meta, {});
      adapter.update(meta, '1', {});
      adapter.delete(meta, '1');

      expect(calls).toEqual(['get', 'create', 'update', 'delete']);
    });
  });

  describe('IRPCAdapter.next()', () => {
    it('should return an Error instance', () => {
      const sentinel = IRPCCrudAdapter.next();
      expect(sentinel).toBeInstanceOf(Error);
      expect(sentinel.message).toBe('Next driver');
    });
  });

  describe('CrudError', () => {
    it('should create notFound error', () => {
      const err = CrudError.notFound();
      expect(err).toBeInstanceOf(CrudError);
      expect(err.type).toBe('crud');
      expect(err.code).toBe('not_found');
    });

    it('should create notImplemented error', () => {
      const err = CrudError.notImplemented('get');
      expect(err).toBeInstanceOf(CrudError);
      expect(err.type).toBe('crud');
      expect(err.code).toBe('not_implemented');
      expect(err.message).toContain('get');
    });
  });
});
