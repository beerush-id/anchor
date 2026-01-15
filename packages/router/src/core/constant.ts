export const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost',
};

export function configure(config: Partial<typeof DEFAULT_CONFIG>) {
  Object.assign(DEFAULT_CONFIG, config);
}
