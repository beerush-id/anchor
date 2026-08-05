import type { IndexRoute, Route } from './route.js';

/**
 * Any concrete route node usable in a route manifest entry.
 */
export type ManifestRoute =
  // biome-ignore lint/suspicious/noExplicitAny: Accept any concrete Route instance.
  | Route<any, any, any, any, any, any, any, any, any>
  // biome-ignore lint/suspicious/noExplicitAny: Accept any concrete IndexRoute instance.
  | IndexRoute<any, any, any, any, any, any, any, any, any>;

/** A single route manifest entry: a canonical path and its route node. */
export type RouteManifestEntry<R extends ManifestRoute = ManifestRoute> = {
  path: string;
  route: R;
};

type EntryTuple = [path: string, route: ManifestRoute];

type EntryMap<Entries extends EntryTuple[]> = {
  [E in Entries[number] as E[0]]: E[1];
};

/**
 * A read-only registry of content routes, keyed by their canonical path.
 *
 * Wraps an internal Map — mutation methods are never exposed, so generated
 * registries stay exactly as generated. Entries hold live route references:
 * `entry.route.meta()` always reads current metadata (no snapshot).
 *
 * Typically created by the `airPages()` Vite plugin as `src/routes.ts`:
 *
 * ```ts
 * export const routes = createRouteManifest([
 *   ['/', indexRoute],
 *   ['/blogs', blogsIndexRoute],
 *   ['/blogs/:slug', blogsDynamicRoute],
 * ] as const);
 * ```
 *
 * @template Entries - The `as const` tuple of `[path, route]` entries.
 */
export class RouteManifest<Entries extends EntryTuple[]> implements Iterable<RouteManifestEntry> {
  readonly #entries: Entries;
  readonly #map: Map<string, ManifestRoute>;

  public get entries() {
    return this.#entries;
  }

  public constructor(entries: Entries) {
    this.#entries = entries;
    this.#map = new Map<string, ManifestRoute>(entries as Iterable<[string, ManifestRoute]>);
  }

  /**
   * Gets the manifest entry for a known canonical path.
   *
   * Fully typed from the entry tuple: passing an unknown path literal is a
   * compile error, and a valid key returns a non-`undefined` entry carrying
   * that route's params/meta types.
   *
   * @param path - A canonical path present in the manifest.
   * @returns The `{ path, route }` entry for the given path.
   */
  public get<Path extends Entries[number][0]>(path: Path): { path: Path; route: EntryMap<Entries>[Path] } {
    return { path, route: this.#map.get(path) } as never;
  }

  /**
   * Iterates over all `{ path, route }` entries in declaration order.
   */
  public *[Symbol.iterator](): Iterator<RouteManifestEntry> {
    for (const [path, route] of this.#map) {
      yield { path, route };
    }
  }

  /**
   * Returns all entries except those matching the given path or pattern.
   *
   * @param pattern - An exact canonical path string, or a RegExp tested against each path.
   * @returns The filtered entries array.
   */
  public except(pattern: string | RegExp): RouteManifestEntry[] {
    return this.#filter((path) => (typeof pattern === 'string' ? path !== pattern : !pattern.test(path)));
  }

  /**
   * Returns all entries nested under the given path prefix
   * (e.g. `routes.under('/docs')` for a docs sidebar section).
   *
   * @param prefix - The path prefix to match.
   * @returns The filtered entries array.
   */
  public under(prefix: string): RouteManifestEntry[] {
    return this.#filter((path) => path.startsWith(prefix));
  }

  #filter(predicate: (path: string) => boolean): RouteManifestEntry[] {
    const results: RouteManifestEntry[] = [];

    for (const [path, route] of this.#map) {
      if (predicate(path)) results.push({ path, route });
    }

    return results;
  }
}

/**
 * Creates a {@link RouteManifest} from an `as const` tuple of `[path, route]` entries.
 *
 * @param entries - The `[canonicalPath, route]` entries (content nodes only).
 * @returns The created route manifest.
 */
export function createRouteManifest<const Entries extends EntryTuple[]>(entries: Entries): RouteManifest<Entries> {
  return new RouteManifest(entries);
}
