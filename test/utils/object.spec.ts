import { expect, test } from 'vitest';
import { read, remove, write } from '../../lib/esm/utils';

test('Read object using path', () => {
  const obj = {
    a: 1,
    b: 2,
    c: {
      d: 3,
      e: 4,
      f: {
        g: 5,
        h: 6,
      },
    },
    d: [1, 2],
    e: [
      {
        a: 1,
        b: 2,
      },
      {
        a: 3,
        b: 4,
      },
    ],
    f: new Set([1, 2, 3]),
    g: new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]),
  };

  expect(read(obj, 'a')).toBe(1);
  expect(read(obj, 'b')).toBe(2);
  expect(read(obj, 'c.d')).toBe(3);
  expect(read(obj, 'c.e')).toBe(4);
  expect(read(obj, 'c.f.g')).toBe(5);
  expect(read(obj, 'c.f.h')).toBe(6);
  expect(read(obj, 'd.0')).toBe(1);
  expect(read(obj, 'd.1')).toBe(2);
  expect(read(obj, 'e.0.a')).toBe(1);
  expect(read(obj, 'e.0.b')).toBe(2);
  expect(read(obj, 'e.1.a')).toBe(3);
  expect(read(obj, 'e.1.b')).toBe(4);
  expect(read(obj, 'f.0' as never)).toBe(undefined);
  expect(read(obj, 'f.1' as never)).toBe(undefined);
  expect(read(obj, 'f.2' as never)).toBe(undefined);
  expect(read(obj, 'g.a' as never)).toBe(undefined);
  expect(read(obj, 'g.b' as never)).toBe(undefined);
  expect(read(obj, 'g.c' as never)).toBe(undefined);
});

test('Read object using path with default value', () => {
  const obj = {
    a: 1,
    b: 2,
    c: {
      d: 3,
      e: 4,
      f: {
        g: 5,
        h: 6,
      },
    },
    d: [1, 2],
    e: [
      {
        a: 1,
        b: 2,
      },
      {
        a: 3,
        b: 4,
      },
    ],
  };

  expect(read(obj, 'a', 0)).toBe(1);
  expect(read(obj, 'b', 0)).toBe(2);
  expect(read(obj, 'c.d', 0)).toBe(3);
  expect(read(obj, 'c.e', 0)).toBe(4);
  expect(read(obj, 'c.f.g', 0)).toBe(5);
  expect(read(obj, 'c.f.h', 0)).toBe(6);
  expect(read(obj, 'd.0', 0)).toBe(1);
  expect(read(obj, 'd.1', 0)).toBe(2);
  expect(read(obj, 'e.0.a', 0)).toBe(1);
  expect(read(obj, 'e.0.b', 0)).toBe(2);
  expect(read(obj, 'e.1.a', 0)).toBe(3);
  expect(read(obj, 'e.1.b', 0)).toBe(4);
  expect(read(obj, 'f' as never, 0)).toBe(0);
  expect(read(obj, 'c.f.i' as never, 0)).toBe(0);
});

test('Write object using path', () => {
  const obj = {
    a: 1,
    b: 2,
    c: {
      d: 3,
      e: 4,
      f: {
        g: 5,
        h: 6,
      },
    },
    d: [1, 2],
    e: [
      {
        a: 1,
        b: 2,
      },
      {
        a: 3,
        b: 4,
      },
    ],
  };

  write(obj, 'a', 10);
  expect(obj.a).toBe(10);

  write(obj, 'b', 20);
  expect(obj.b).toBe(20);

  write(obj, 'c.d', 30);
  expect(obj.c.d).toBe(30);

  write(obj, 'c.e', 40);
  expect(obj.c.e).toBe(40);

  write(obj, 'c.f.g', 50);
  expect(obj.c.f.g).toBe(50);

  write(obj, 'c.f.h', 60);
  expect(obj.c.f.h).toBe(60);

  write(obj, 'd.0', 10);
  expect(obj.d[0]).toBe(10);

  write(obj, 'd.1', 20);
  expect(obj.d[1]).toBe(20);

  write(obj, 'e.0.a', 10);
  expect(obj.e[0].a).toBe(10);

  write(obj, 'e.0.b', 20);
  expect(obj.e[0].b).toBe(20);

  write(obj, 'e.1.a', 30);
  expect(obj.e[1].a).toBe(30);

  write(obj, 'e.1.b', 40);
  expect(obj.e[1].b).toBe(40);

  write(obj, 'e.2.a', 50);
  expect(obj.e[2].a).toBe(50);
  expect(obj.e[2].b).toBe(undefined);

  write(obj as never as { f: number }, 'f', 0);
  expect((obj as never as { f: number }).f).toBe(0);

  write(obj as never as { c: { f: { i: number } } }, 'c.f.i', 0);
  expect((obj as never as { c: { f: { i: number } } }).c.f.i).toBe(0);

  write(obj as never as { h: Date }, 'h', new Date());
  expect((obj as never as { h: Date }).h).toBeInstanceOf(Date);

  write(obj as never as { i: RegExp }, 'i', /./);
  expect((obj as never as { i: RegExp }).i).toBeInstanceOf(RegExp);

  write(obj as never as { j: Set<number> }, 'j', new Set([1, 2, 3]));
  expect((obj as never as { j: Set<number> }).j).toBeInstanceOf(Set);

  write(
    obj as never as { k: Map<string, number> },
    'k',
    new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
  );

  expect((obj as never as { k: Map<string, number> }).k).toBeInstanceOf(Map);
});

test('Remove value from object using path', () => {
  const obj = {
    a: 1,
    b: 2,
    c: {
      d: 3,
      e: 4,
      f: {
        g: 5,
        h: 6,
      },
    },
    d: [1, 2],
    e: [
      {
        a: 1,
        b: 2,
      },
      {
        a: 3,
        b: 4,
      },
    ],
    f: {
      a: 1,
      b: {
        c: 2,
        d: 3,
        e: {
          a: 4,
          b: 5,
        },
      },
    },
  };

  remove(obj, 'a');
  expect(obj.a).toBe(undefined);
  expect('a' in obj).toBe(false);

  remove(obj, 'b');
  expect(obj.b).toBe(undefined);
  expect('b' in obj).toBe(false);

  remove(obj, 'c.d');
  expect(obj.c.d).toBe(undefined);
  expect('d' in obj.c).toBe(false);

  remove(obj, 'c.e');
  expect(obj.c.e).toBe(undefined);
  expect('e' in obj.c).toBe(false);

  remove(obj, 'c.f.g');
  expect(obj.c.f.g).toBe(undefined);
  expect('g' in obj.c.f).toBe(false);

  remove(obj, 'c.f.h');
  expect(obj.c.f.h).toBe(undefined);
  expect('h' in obj.c.f).toBe(false);

  remove(obj, 'd.0');
  expect(obj.d[0]).toBe(2);
  expect(obj.d.length).toBe(1);

  remove(obj, 'd.1');
  expect(obj.d[0]).toBe(2);
  expect(obj.d.length).toBe(1);

  remove(obj, 'e.0');
  expect(obj.e.length).toBe(1);
  expect(obj.e[0].a).toBe(3);
  expect(obj.e[0].b).toBe(4);

  remove(obj, 'f.b');
  expect(obj.f.b).toBe(undefined);
  expect('b' in obj.f).toBe(false);
  expect(read(obj, 'f.a')).toBe(1);
  expect(read(obj, 'f.b')).toBe(undefined);
  expect(read(obj, 'f.b.c')).toBe(undefined);
  expect(read(obj, 'f.b.d')).toBe(undefined);
  expect(read(obj, 'f.b.d')).toBe(undefined);
  expect(read(obj, 'f.c' as never)).toBe(undefined);
});

test('Object reference of mutated object', () => {
  const f = {
    g: 5,
    h: 6,
  };
  const c = {
    d: 3,
    e: 4,
    f,
  };
  const d = [1, 2];
  const e = [
    {
      a: 1,
      b: 2,
    },
    {
      a: 3,
      b: 4,
    },
  ];
  const obj = {
    a: 1,
    b: 2,
    c,
    d,
    e,
  };
  const ref = { c, d, e };

  write(obj, 'a', 10);
  expect(read(obj, 'a')).toBe(10);
  expect(read(ref, 'a' as never)).toBe(undefined);

  write(obj, 'c.d', 30);
  expect(read(obj, 'c.d')).toBe(30);
  expect(read(ref, 'c.d')).toBe(30);

  write(obj, 'c', { d: 31, e: 40, f: { g: 50, h: 60 } });
  expect(read(obj, 'c.d')).toBe(31);
  expect(read(ref, 'c.d')).toBe(30);

  write(obj, 'd.0', 10);
  expect(read(obj, 'd.0')).toBe(10);
  expect(read(ref, 'd.0')).toBe(10);

  write(obj, 'd', [10, 20]);
  expect(read(obj, 'd.0')).toBe(10);
  expect(read(ref, 'd.0')).toBe(10);

  write(obj, 'e.0.a', 10);
  expect(read(obj, 'e.0.a')).toBe(10);
  expect(read(ref, 'e.0.a')).toBe(10);

  write(obj, 'e.0', { a: 1, b: 20 });
  expect(read(obj, 'e.0.a')).toBe(1);
  expect(read(ref, 'e.0.a')).toBe(1);
});
