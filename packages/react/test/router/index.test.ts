import '../../src/client/index.js';
import { describe, expect, it } from 'vitest';
import * as RouterIndex from '../../src/router/index.js';

describe('Anchor React - Router Index', () => {
  it('should export all essential router utilities', () => {
    expect(RouterIndex.Link).toBeDefined();
    expect(RouterIndex.RouteViewer).toBeDefined();
    expect(RouterIndex.UIRouter).toBeDefined();
    expect(RouterIndex.route).toBeDefined();
    expect(RouterIndex.navigate).toBeDefined();
  });
});
