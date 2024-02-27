import { expect, test } from 'vitest';
import { cookie, setCookieContext } from '../../lib/esm/store';

test('validates Cookie object', () => {
  const destroy = setCookieContext('foo=bar; path=/');

  const [ c ] = cookie<{ foo: string }>();

  expect(c.foo).toBe('bar');

  destroy();
});
