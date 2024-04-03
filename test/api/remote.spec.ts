import { expect, test } from 'vitest';
import { Remote } from '../../lib/esm/api';
import { Rec } from '../../lib/esm';

const baseURL = 'http://localhost:3000';

test('Validate Remote object', () => {
  const remote = new Remote(baseURL);

  expect(remote).toBeDefined();
  expect(remote.baseUrl).toBe(baseURL);
  expect(remote.headers['accept']).toBe('application/json');
  expect(remote.headers['content-type']).toBe('application/json');
});

test('Validate Endpoint objects', () => {
  const remote = new Remote(baseURL);
  const users = remote.endpoint('user', { endpoint: 'users' });

  expect(users).toBeDefined();
  expect((users as never as Record<string, Rec>).config.name).toBe('user');
  expect((users as never as Record<string, Rec>).config.endpoint).toBe('users');
});

test('Validate Query objects', () => {
  const remote = new Remote(baseURL);
  const users = remote.endpoint('user', { endpoint: 'users' });
  const query = users.query();

  expect(query.status).toBe('idle');
  expect(query.data).toEqual([]);
  expect(query.meta).toEqual({});
  expect(typeof query.fetch).toBe('function');
});
