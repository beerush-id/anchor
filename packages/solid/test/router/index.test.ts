import { describe, expect, it } from 'vitest';
import * as routerIndex from '../../src/index.js';

describe('Anchor Solid - Router Index Barrel', () => {
  it('re-exports all router modules', () => {
    // Core router re-exports
    expect(routerIndex.createRouter).toBeDefined();

    // Head components
    expect(routerIndex.Head).toBeDefined();
    expect(routerIndex.JsonLd).toBeDefined();
    expect(routerIndex.Title).toBeDefined();
    expect(routerIndex.Meta).toBeDefined();
    expect(routerIndex.HeadLink).toBeDefined();
    expect(routerIndex.Style).toBeDefined();
    expect(routerIndex.headings).toBeDefined();
    expect(routerIndex.attachHeading).toBeDefined();

    // Link
    expect(routerIndex.Link).toBeDefined();

    // Navigate
    expect(routerIndex.navigate).toBeDefined();

    // Router
    expect(routerIndex.UIRouter).toBeDefined();
    expect(routerIndex.RouteViewer).toBeDefined();
    expect(routerIndex.RouteRendererComponent).toBeDefined();
    expect(routerIndex.page).toBeDefined();
    expect(routerIndex.modal).toBeDefined();
  });
});
