import { expect, test } from 'vitest';
import { speak, translator } from '../../lib/esm/i18n';

console.log(translator.global);

test('speak', () => {
  const value = speak('Hello, {name}!', { name: 'World' });

  expect(value).toBe('Hello, World!');
});

test('speak: missing key', () => {
  const value = speak('Hello, {name}!', { age: 10 });

  expect(value).toBe('Hello, {name}!');
});
