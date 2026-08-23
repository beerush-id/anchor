import { describe, expect, it } from 'vitest';
import { inherit } from '../src/engine/proxy.js';

describe('Configuration Inheritance (inherit)', () => {
  type AppConfig = {
    app: {
      name: string;
      env: 'development' | 'production' | 'staging';
      debug: boolean;
    };
    http: {
      host: string;
      port: number;
      cors: {
        origin: string;
        credentials: boolean;
      };
      timeout: number;
    };
    router: {
      basePath: string;
      trailingSlash: boolean;
      ssr: {
        enabled: boolean;
        streaming: boolean;
        timeout: number;
      };
    };
    theme: {
      mode: 'light' | 'dark' | 'auto';
      colors: {
        primary: string;
        surface: string;
        accent: string;
      };
      typography: {
        fontSans: string;
        fontSize: number;
      };
    };
    features: {
      analytics: boolean;
      betaUI: boolean;
      experimentalSSR: boolean;
    };
  };

  describe('Multi-Domain Layered Composition', () => {
    it('should compose realistic multi-subsystem configuration across root, preset, and route scopes', () => {
      // Global / Root Layer: Defines complete baseline across all domains
      const rootConfig: AppConfig = {
        app: {
          name: 'AirStack Portal',
          env: 'development',
          debug: true,
        },
        http: {
          host: '0.0.0.0',
          port: 3000,
          cors: {
            origin: '*',
            credentials: true,
          },
          timeout: 5000,
        },
        router: {
          basePath: '/',
          trailingSlash: false,
          ssr: {
            enabled: false,
            streaming: false,
            timeout: 3000,
          },
        },
        theme: {
          mode: 'light',
          colors: {
            primary: '#0066ff',
            surface: '#ffffff',
            accent: '#00cc88',
          },
          typography: {
            fontSans: 'Inter, sans-serif',
            fontSize: 16,
          },
        },
        features: {
          analytics: false,
          betaUI: false,
          experimentalSSR: false,
        },
      };

      // Middle / Preset Layer: Enables SSR and adjusts router/http for production preset
      const presetConfig: Partial<AppConfig> = {
        app: {
          name: 'AirStack Portal',
          env: 'production',
          debug: false,
        },
        router: {
          basePath: '/',
          trailingSlash: false,
          ssr: {
            enabled: true,
            streaming: true,
            timeout: 5000,
          },
        },
        features: {
          analytics: true,
          betaUI: false,
          experimentalSSR: true,
        },
      };

      // Local / Route Layer: Overrides only contextual route concerns
      const routeConfig: Partial<AppConfig> = {
        theme: {
          mode: 'dark',
          colors: {
            primary: '#ff3366',
            surface: '#121212',
            accent: '#00cc88',
          },
          typography: {
            fontSans: 'Inter, sans-serif',
            fontSize: 16,
          },
        },
        features: {
          analytics: true,
          betaUI: true,
          experimentalSSR: true,
        },
      };

      const resolved = inherit<AppConfig>(rootConfig, presetConfig, routeConfig);

      // Route layer overrides
      expect(resolved.theme.mode).toBe('dark');
      expect(resolved.theme.colors.primary).toBe('#ff3366');
      expect(resolved.features.betaUI).toBe(true);

      // Preset layer overrides
      expect(resolved.app.env).toBe('production');
      expect(resolved.app.debug).toBe(false);
      expect(resolved.router.ssr.enabled).toBe(true);
      expect(resolved.router.ssr.streaming).toBe(true);
      expect(resolved.features.analytics).toBe(true);

      // Root baseline untouched domains pass through seamlessly
      expect(resolved.http.host).toBe('0.0.0.0');
      expect(resolved.http.port).toBe(3000);
      expect(resolved.http.cors.credentials).toBe(true);
      expect(resolved.theme.typography.fontSans).toBe('Inter, sans-serif');
      expect(resolved.theme.colors.accent).toBe('#00cc88');
    });

    it('should propagate live upstream updates to nested subsystems without affecting local overrides', () => {
      const rootConfig: AppConfig = {
        app: { name: 'Anchor App', env: 'development', debug: false },
        http: { host: 'localhost', port: 8000, cors: { origin: 'localhost', credentials: false }, timeout: 10000 },
        router: { basePath: '/app', trailingSlash: true, ssr: { enabled: true, streaming: false, timeout: 2000 } },
        theme: {
          mode: 'light',
          colors: { primary: '#111', surface: '#fff', accent: '#333' },
          typography: { fontSans: 'Roboto', fontSize: 14 },
        },
        features: { analytics: true, betaUI: false, experimentalSSR: false },
      };

      const routeConfig = {
        theme: {
          mode: 'dark' as const,
          colors: { primary: '#999', surface: '#000', accent: '#333' },
        },
      };

      const resolved = inherit<AppConfig>(rootConfig, routeConfig as unknown as AppConfig);

      expect(resolved.http.port).toBe(8000);
      expect(resolved.theme.mode).toBe('dark'); // Local route override

      // Live update on root HTTP port and root surface color
      rootConfig.http.port = 9000;
      rootConfig.http.timeout = 15000;
      rootConfig.theme.typography.fontSize = 18;

      expect(resolved.http.port).toBe(9000);
      expect(resolved.http.timeout).toBe(15000);
      expect(resolved.theme.typography.fontSize).toBe(18);

      // Local override remains stable
      expect(resolved.theme.mode).toBe('dark');
    });

    it('should isolate local runtime mutations to the active route scope', () => {
      const rootConfig: AppConfig = {
        app: { name: 'Portal', env: 'production', debug: false },
        http: { host: '0.0.0.0', port: 443, cors: { origin: '*', credentials: true }, timeout: 5000 },
        router: { basePath: '/', trailingSlash: false, ssr: { enabled: true, streaming: true, timeout: 5000 } },
        theme: {
          mode: 'light',
          colors: { primary: '#0066ff', surface: '#fff', accent: '#00cc88' },
          typography: { fontSans: 'Inter', fontSize: 16 },
        },
        features: { analytics: true, betaUI: false, experimentalSSR: false },
      };

      const routeScope: Partial<AppConfig> = {};
      const resolved = inherit<AppConfig>(rootConfig, routeScope);

      // Mutate active route scope
      resolved.app = { name: 'Custom Page', env: 'production', debug: true };

      expect(resolved.app.name).toBe('Custom Page');
      expect(resolved.app.debug).toBe(true);
      expect(routeScope.app?.name).toBe('Custom Page');

      // Shared root baseline remains pristine
      expect(rootConfig.app.name).toBe('Portal');
      expect(rootConfig.app.debug).toBe(false);
    });

    it('should reflect complete composite shape during introspection and serialization', () => {
      const baseOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit' as const,
      };

      const customOptions = {
        headers: { Authorization: 'Bearer token-xyz' },
        credentials: 'include' as const,
      };

      const resolved = inherit<Record<string, unknown>>(baseOptions, customOptions);

      expect('method' in resolved).toBe(true);
      expect('credentials' in resolved).toBe(true);
      expect(resolved.credentials).toBe('include');

      const keys = Object.keys(resolved);
      expect(keys).toContain('method');
      expect(keys).toContain('headers');
      expect(keys).toContain('credentials');

      // Destructured composite view
      const flattened = { ...resolved };
      expect(flattened.method).toBe('POST');
      expect(flattened.credentials).toBe('include');
    });

    it('should unmask parent value when deleting a local override', () => {
      type HeaderConfig = { [key: string]: string | undefined };

      const baseHeaders: HeaderConfig = { 'X-Env': 'production', 'X-App': 'Portal' };
      const localHeaders: HeaderConfig = { 'X-Env': 'staging', 'X-Custom': 'local' };
      const resolved = inherit<HeaderConfig>(baseHeaders, localHeaders);

      expect(resolved['X-Env']).toBe('staging');

      // Delete local override -> falls back to base
      delete resolved['X-Env'];
      expect(localHeaders['X-Env']).toBeUndefined();
      expect(baseHeaders['X-Env']).toBe('production');
      expect(resolved['X-Env']).toBe('production');

      // Delete local-only property -> becomes undefined
      delete resolved['X-Custom'];
      expect(resolved['X-Custom']).toBeUndefined();
      expect('X-Custom' in resolved).toBe(false);
    });

    it('should isolate base layers when attempting to delete inherited properties', () => {
      type HeaderConfig = { [key: string]: string | undefined };

      const baseHeaders: HeaderConfig = { 'X-App': 'Portal' };
      const localHeaders: HeaderConfig = {};
      const resolved = inherit<HeaderConfig>(baseHeaders, localHeaders);

      // Attempt to delete property that exists only in base
      delete resolved['X-App'];

      // Base layer remains pristine and still accessible
      expect(baseHeaders['X-App']).toBe('Portal');
      expect(resolved['X-App']).toBe('Portal');
    });

    it('should handle zero-argument invocations gracefully during set and delete', () => {
      const empty = inherit<Record<string, unknown>>();

      // Setting on empty proxy
      empty.testKey = 'value';
      expect(empty.testKey).toBeUndefined();

      // Deleting on empty proxy
      delete empty.testKey;
      expect(empty.testKey).toBeUndefined();
    });

    it('should handle descriptor reflection for prototype-inherited and non-existent properties', () => {
      const protoBase = Object.create({ protoKey: 'protoValue' });
      const config = inherit<Record<string, unknown>>(protoBase);

      // Prototype fallback descriptor
      const protoDesc = Object.getOwnPropertyDescriptor(config, 'protoKey');
      expect(protoDesc).toBeDefined();
      expect(protoDesc?.value).toBe('protoValue');
      expect(protoDesc?.enumerable).toBe(true);

      // Non-existent property descriptor
      const nonExistentDesc = Object.getOwnPropertyDescriptor(config, 'doesNotExist');
      expect(nonExistentDesc).toBeUndefined();
    });
  });
});
