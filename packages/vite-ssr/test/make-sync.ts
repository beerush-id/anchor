import { createPagesSync, type PagesSyncOptions } from '../src/pages/sync.js';
import { fixturePath } from './fixture.js';

/**
 * Creates a pages sync over a fixture directory, recording
 * missing-router notifications.
 */
export function makeSync(dir: string, extra?: Partial<PagesSyncOptions>) {
  const missing: string[] = [];

  const sync = createPagesSync({
    pagesDir: fixturePath(dir, 'pages'),
    routerFile: fixturePath(dir, 'router.ts'),
    manifestDir: fixturePath(dir, 'manifest'),
    framework: 'react',
    onRouterMissing: () => missing.push('router'),
    ...extra,
  });

  return { sync, missing };
}
