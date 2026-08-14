import { META_STORE, type MetadataStore } from './metadata.js';

export type Framework = 'react' | 'solid';

export type AirEnv = {
  meta: MetadataStore;
  rootDir: string;
  framework: Framework;
  currentUrl?: string;
};

export const AIR_ENV: AirEnv = {
  meta: META_STORE,
  rootDir: 'src',
  framework: 'react',
};
