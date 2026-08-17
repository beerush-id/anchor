import { describe, expect, it } from 'vitest';
import { AIR_ENV } from '../src/modules/env.js';
import { cleanFixture, fixturePath, makeFixture } from './fixture.js';

describe('route registry — resolution against an unattached tree', () => {
  it('returns nothing before the route tree is attached', () => {
    const dir = makeFixture({});

    try {
      expect(AIR_ENV.routes.resolve(fixturePath(dir, 'pages/page.tsx'))).toBeUndefined();
    } finally {
      cleanFixture(dir);
    }
  });
});
