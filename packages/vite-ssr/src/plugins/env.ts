import type { UserConfig } from 'vite';

export { AIR_ENV, type AirEnv, detectFramework, type Framework, initEnv } from '../modules/env.js';

/**
 * Returns Vite resolve alias configuration for the AIR Stack project root.
 *
 * @param root Project root directory.
 */
export function airEnvConfig(root: string): UserConfig {
  return {
    resolve: {
      alias: {
        '@': root,
      },
    },
  };
}
