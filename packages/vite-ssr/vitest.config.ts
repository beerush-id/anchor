import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'fixture-alias-resolver',
      resolveId(id, importer) {
        if (id.startsWith('@/') && importer) {
          const match = importer.match(/(.*\/test\/\.tmp\/[^/]+)/);
          if (match) {
            const fixtureRoot = match[1];
            const target = path.resolve(fixtureRoot, id.slice(2));
            if (fs.existsSync(target)) return target;
            const tsTarget = target.replace(/\.js$/, '.ts');
            if (fs.existsSync(tsTarget)) return tsTarget;
            return target;
          }
        }
      },
    },
  ],
  test: {
    include: ['test/**/*.{test,spec}.{ts,js}'],
    setupFiles: ['./test/setup.ts'],
    reporters: ['default', 'html'],
    outputFile: './coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/modules/**/*.ts', 'src/utils/**/*.ts'],
      exclude: ['src/plugins/**/*.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
